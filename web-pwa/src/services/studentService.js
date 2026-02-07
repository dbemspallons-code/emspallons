/**
 * Service de gestion des Ã©tudiants et paiements
 * Utilise window.storage avec shared:true
 */

import { supabase } from '../supabase/supabaseClient';
import { getCurrentUser } from './authService';
import { qrCodeService } from './qrCodeService';
import { historyService } from './historyService';
import { PAYMENT_CONFIG } from '../constants/payment';
import { calculatePaymentPlan } from '../utils/payment';
import { clearLastScan } from './scanService';
import { recordResubscription } from './subscriptionService';

const STUDENTS_KEY = 'students';
const PAYMENTS_KEY = 'payments';

function splitFullName(fullName) {
  if (!fullName) return { nom: '', prenom: '' };
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length <= 1) return { nom: parts[0] || '', prenom: '' };
  return { nom: parts[0], prenom: parts.slice(1).join(' ') };
}

function normalizePhone(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/[^0-9+]/g, '');
  if (!cleaned) return null;
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function toFrenchSupabaseError(error) {
  const raw = String(error?.message || error || '').trim();
  if (!raw) return 'Erreur inconnue';

  if (/schema cache/i.test(raw) || /column .* does not exist/i.test(raw) || /relation .* does not exist/i.test(raw)) {
    return 'Schema Supabase incomplet. Ajoutez les colonnes requises puis rechargez le schema.';
  }
  if (/duplicate key/i.test(raw) || /unique constraint/i.test(raw)) {
    return 'Valeur deja existante (doublon). Verifiez les donnees.';
  }
  if (/foreign key/i.test(raw)) {
    return 'Reference invalide. Verifiez les donnees liees.';
  }
  return raw;
}

function normalizeStudentRow(row) {
  if (!row) return null;
  const hasNames = row.last_name || row.first_name;
  const fallback = splitFullName(row.name || '');
  return {
    id: row.id,
    nom: row.last_name || (hasNames ? '' : fallback.nom) || row.name || '',
    prenom: row.first_name || (hasNames ? '' : fallback.prenom) || '',
    promo: row.promo || row.niveau || '',
    classe: row.class || row.class_group || '',
    busLine: row.bus_line || row.busLine || '',
    pickupPoint: row.pickup_point || row.pickupPoint || '',
    guardian: row.guardian || row.tuteur || '',
    contact: row.phone || row.email || '',
    email: row.email || '',
    dateCreation: row.created_at,
    status: row.status || 'active',
    notes: row.notes || '',
    raw: row,
  };
}

function computeGraceEnd(endIso) {
  if (!endIso) return null;
  const date = new Date(endIso);
  if (Number.isNaN(date.getTime())) return null;
  const grace = new Date(date);
  grace.setDate(grace.getDate() + PAYMENT_CONFIG.GRACE_PERIOD_DAYS);
  grace.setHours(23, 59, 59, 999);
  return grace.toISOString();
}

function computePeriodEnd(startIso, numberOfMonths) {
  if (!startIso) return null;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const months = Math.max(1, Number(numberOfMonths) || 1);
  const end = new Date(start.getFullYear(), start.getMonth() + months, 0, 23, 59, 59, 999);
  return end.toISOString();
}

function normalizePaymentRow(row) {
  if (!row) return null;
  const numberOfMonths = row.number_of_months || row.nombre_mois || row.nombreMois || 1;
  const totalAmount = row.total_amount || row.montant_total || row.amount || 0;
  const monthlyFee = row.monthly_fee || row.montant_mensuel || (numberOfMonths ? totalAmount / Number(numberOfMonths) : 0);
  const periodStart = row.period_start || row.mois_debut || (row.period_date ? new Date(row.period_date).toISOString() : null);
  const periodEnd = row.period_end || row.mois_fin || computePeriodEnd(periodStart, numberOfMonths);
  const graceEnd = row.grace_end || row.date_grace_fin || row.dateGraceFin || computeGraceEnd(periodEnd);

  return {
    id: row.id,
    studentId: row.subscriber_id || row.student_id || row.studentId,
    montantTotal: Number(totalAmount) || 0,
    montantMensuel: Number(monthlyFee) || 0,
    nombreMois: Number(numberOfMonths) || 1,
    moisDebut: periodStart,
    moisFin: periodEnd,
    dateGraceFin: graceEnd,
    dateEnregistrement: row.created_at || row.date_enregistrement || row.dateEnregistrement,
    method: row.method || row.payment_method || row.paymentMethod || null,
    description: row.description || null,
    raw: row,
  };
}

/**
 * Structure Ã©tudiant:
 * {
 *   id: string,
 *   nom: string,
 *   prenom: string,
 *   classe: string,
 *   contact: string,
 *   dateCreation: string (ISO),
 *   creePar: { userId, nom },
 *   notes: string
 * }
 */

/**
 * Structure paiement:
 * {
 *   id: string,
 *   studentId: string,
 *   montantTotal: number,
 *   nombreMois: number (1, 2, 3, 5, 6, 12),
 *   moisDebut: string (ISO - toujours 1er du mois),
 *   moisFin: string (ISO - dernier jour du mois),
 *   dateGraceFin: string (ISO - moisFin + 5 jours),
 *   montantMensuel: number (calculÃ©: montantTotal / nombreMois),
 *   description: string,
 *   educateurNom: string,
 *   educateurId: string,
 *   dateEnregistrement: string (ISO - date rÃ©elle du paiement)
 * }
 */

/**
 * Calcule les dates d'abonnement selon les rÃ¨gles:
 * - Toujours commencer le 1er du mois en cours
 * - Finir le dernier jour du dernier mois couvert
 * - PÃ©riode de grÃ¢ce: +5 jours aprÃ¨s la fin
 */
function calculateSubscriptionDates(datePaiement, nombreMois) {
  const date = new Date(datePaiement);
  
  // Mois de dÃ©but: toujours le 1er du mois en cours
  const moisDebut = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  
  // Mois de fin: dernier jour du dernier mois couvert
  const moisFin = new Date(date.getFullYear(), date.getMonth() + nombreMois, 0, 23, 59, 59, 999);
  
  // Date de fin de grÃ¢ce configurable
  const dateGraceFin = new Date(moisFin);
  dateGraceFin.setDate(dateGraceFin.getDate() + PAYMENT_CONFIG.GRACE_PERIOD_DAYS);
  dateGraceFin.setHours(23, 59, 59, 999);
  
  return {
    moisDebut: moisDebut.toISOString(),
    moisFin: moisFin.toISOString(),
    dateGraceFin: dateGraceFin.toISOString(),
  };
}

/**
 * RÃ©cupÃ¨re tous les Ã©tudiants (Supabase `subscribers`)
 */
export async function getAllStudents() {
  try {
    const { data, error } = await supabase.from('subscribers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizeStudentRow).filter(Boolean);
  } catch (error) {
    console.error('Erreur getAllStudents (Supabase):', error);
    return [];
  }
}

/**
 * RÃ©cupÃ¨re un Ã©tudiant par ID (Supabase)
 */
export async function getStudentById(id) {
  try {
    const { data, error } = await supabase.from('subscribers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return normalizeStudentRow(data);
  } catch (error) {
    console.error('Erreur getStudentById (Supabase):', error);
    return null;
  }
}

/**
 * CrÃ©e un nouvel Ã©tudiant
 */
export async function createStudent(studentData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez etre connecte');
  }

  const lastName = (studentData.nom || '').trim();
  const firstName = (studentData.prenom || '').trim();
  const fullName = [lastName, firstName].filter(Boolean).join(' ').trim();

  const newStudent = {
    name: fullName || lastName || firstName || 'Etudiant',
    first_name: firstName || null,
    last_name: lastName || null,
    promo: studentData.promo?.trim() || studentData.niveau?.trim() || null,
    class: studentData.classe?.trim() || studentData.classGroup?.trim() || '',
    bus_line: studentData.busLine || null,
    pickup_point: studentData.pickupPoint?.trim() || null,
    guardian: studentData.guardian?.trim() || null,
    phone: normalizePhone(studentData.contact) || studentData.contact?.trim() || null,
    email: studentData.email?.trim() || null,
    notes: studentData.notes?.trim() || null,
    status: 'active',
  };

  try {
    const { data, error } = await supabase.from('subscribers').insert([newStudent]).select().maybeSingle();
    if (error) throw error;
    const created = data;

    // Generate QR using existing service (may write to qr_codes table via server-side function)
    const temp = { id: created.id, nom: newStudent.name, prenom: '', classe: newStudent.class, contact: newStudent.phone };
    try {
      const { qrImage, payload } = await qrCodeService.generateStudentQR(temp);
      const printableCard = await qrCodeService.generatePrintableCard(temp, qrImage);
      // Optionally persist QR token via Netlify function or supabase table (qr_codes table exists server-side)
    } catch (error) {
      console.warn('Generation QR echouee', error);
    }

    await historyService.log({
      type: 'STUDENT_CREATED',
      entityId: created.id,
      entityType: 'STUDENT',
      action: 'STUDENT_CREATED',
      details: {
        studentName: `${newStudent.name}`,
        classe: newStudent.class,
        promo: newStudent.promo,
        busLine: newStudent.bus_line,
      },
    });

    return normalizeStudentRow(created);
  } catch (error) {
    console.error('Erreur createStudent (Supabase):', error);
    throw new Error(toFrenchSupabaseError(error));
  }
}

/**
 * Met Ã  jour un Ã©tudiant
 */
export async function updateStudent(studentId, updates) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez etre connecte');
  }

  const updateData = {};
  if (updates.nom !== undefined) updateData.last_name = updates.nom.trim();
  if (updates.prenom !== undefined) updateData.first_name = updates.prenom.trim();
  if (updates.nom !== undefined || updates.prenom !== undefined) {
    const name = `${updates.nom || ''} ${updates.prenom || ''}`.trim();
    if (name) updateData.name = name;
  }
  if (updates.promo !== undefined || updates.niveau !== undefined) updateData.promo = (updates.promo || updates.niveau || '').trim();
  if (updates.classe !== undefined || updates.classGroup !== undefined) updateData.class = (updates.classe || updates.classGroup || '').trim();
  if (updates.busLine !== undefined) updateData.bus_line = updates.busLine || null;
  if (updates.pickupPoint !== undefined) updateData.pickup_point = updates.pickupPoint?.trim() || null;
  if (updates.guardian !== undefined) updateData.guardian = updates.guardian?.trim() || null;
  if (updates.contact !== undefined) updateData.phone = normalizePhone(updates.contact) || updates.contact.trim();
  if (updates.email !== undefined) updateData.email = updates.email.trim();
  if (updates.notes !== undefined) updateData.notes = updates.notes.trim();

  try {
    const { data, error } = await supabase.from('subscribers').update(updateData).eq('id', studentId).select().maybeSingle();
    if (error) throw error;

    await historyService.log({
      type: 'STATUS_CHANGE',
      entityId: studentId,
      entityType: 'STUDENT',
      action: 'STUDENT_UPDATED',
      details: {
        updates,
        updatedBy: currentUser.nom,
        updatedAt: new Date().toISOString(),
      },
    });

    return data;
  } catch (error) {
    console.error('Erreur updateStudent (Supabase):', error);
    throw new Error(toFrenchSupabaseError(error));
  }
}

/**
 * Supprime un Ã©tudiant
 */
export async function deleteStudent(studentId) {
  try {
    const { error } = await supabase.from('subscribers').delete().eq('id', studentId);
    if (error) throw error;

    // Payments and qr_codes should be cascade-deleted if DB was configured with FK ON DELETE CASCADE
    return { success: true };
  } catch (error) {
    console.error('Erreur deleteStudent (Supabase):', error);
    throw error;
  }
}

/**
 * RÃ©cupÃ¨re tous les paiements
 */
export async function getAllPayments() {
  try {
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizePaymentRow).filter(Boolean);
  } catch (error) {
    console.error('Erreur getAllPayments (Supabase):', error);
    return [];
  }
}

/**
 * RÃ©cupÃ¨re les paiements d'un Ã©tudiant
 */
export async function getPaymentsByStudentId(studentId) {
  try {
    const { data, error } = await supabase.from('payments').select('*').eq('subscriber_id', studentId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalizePaymentRow).filter(Boolean);
  } catch (error) {
    console.error('Erreur getPaymentsByStudentId (Supabase):', error);
    return [];
  }
}

/**
 * CrÃ©e un nouveau paiement
 */
export async function createPayment(paymentData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez etre connecte');
  }

  // VÃ©rifier que l'Ã©tudiant existe
  const student = await getStudentById(paymentData.studentId);
  if (!student) throw new Error('Etudiant introuvable');

  const plan = paymentData.plan || null;
  const nombreMois = Number(paymentData.nombreMois || plan?.numberOfMonths || 1);
  const montantMensuel = Number(paymentData.montantMensuel || plan?.monthlyFee || PAYMENT_CONFIG.DEFAULT_MONTHLY_FEE);
  const montantTotal = Number(paymentData.montantTotal || plan?.totalAmount || (montantMensuel * nombreMois));
  const dateEnregistrement = paymentData.dateEnregistrement || new Date().toISOString();
  const { moisDebut, moisFin, dateGraceFin } = calculateSubscriptionDates(dateEnregistrement, nombreMois);
  const periodStart = plan?.periodStart ? new Date(plan.periodStart).toISOString() : moisDebut;
  const periodEnd = plan?.periodEnd ? new Date(plan.periodEnd).toISOString() : moisFin;
  const graceEnd = plan?.graceEnd ? new Date(plan.graceEnd).toISOString() : dateGraceFin;

  const resolvedBusLine = paymentData.busLine || student.busLine || student?.raw?.bus_line || null;

  const paymentRow = {
    subscriber_id: paymentData.studentId,
    amount: montantTotal,
    total_amount: montantTotal,
    number_of_months: nombreMois,
    monthly_fee: montantMensuel,
    period_date: periodStart.slice(0, 10),
    period_start: periodStart,
    period_end: periodEnd,
    grace_end: graceEnd,
    method: paymentData.method || paymentData.paymentMethod || null,
    description: paymentData.description || null,
    created_by: currentUser.id,
    bus_line: resolvedBusLine,
  };

  try {
    const { data, error } = await supabase.from('payments').insert([paymentRow]).select().maybeSingle();
    if (error) throw error;

    // Record subscription history
    try {
      await recordResubscription({
        studentId: paymentData.studentId,
        startDate: dateEnregistrement,
        durationMonths: nombreMois,
        amountPaid: montantTotal,
        paymentMethod: paymentData.method || paymentData.paymentMethod,
        busLine: resolvedBusLine,
        previousSubscriptionId: paymentData.previousSubscriptionId || null,
      }, { userId: currentUser.id, userName: currentUser.name || currentUser.nom, userEmail: currentUser.email });
    } catch (err) {
      console.warn('Impossible d\'enregistrer l\'historique d\'abonnement:', err);
    }

    await historyService.log({
      type: 'PAYMENT_CREATED',
      entityId: data.id,
      entityType: 'PAYMENT',
      action: 'PAYMENT_CREATED',
      details: {
        amount: paymentRow.amount,
        subscriberId: paymentRow.subscriber_id,
      },
    });

    // Clear last scan cache for this student
    try { await clearLastScan(paymentData.studentId); } catch (err) { /* ignore */ }

    return normalizePaymentRow(data);
  } catch (error) {
    console.error('Erreur createPayment (Supabase):', error);
    throw new Error(toFrenchSupabaseError(error));
  }
}

/**
 * Supprime un paiement
 */
export async function deletePayment(paymentId) {
  const payments = await getAllPayments();
  const filtered = payments.filter(p => p.id !== paymentId);
  await setStorage(PAYMENTS_KEY, filtered);
}

/**
 * Calcule le statut d'un Ã©tudiant
 */
export function calculateStudentStatus(student, payments) {
  const studentPayments = payments.filter(p => p.studentId === student.id);
  
  if (studentPayments.length === 0) {
    return {
      statut: 'AUCUN',
      couleur: 'gray',
      message: 'Aucun abonnement',
      acces: false,
      dateFin: null,
      joursRestants: null,
    };
  }

  // Trouver le paiement avec la date de fin la plus Ã©loignÃ©e
  const dernierPaiement = studentPayments.reduce((latest, current) => {
    const latestDate = new Date(latest.moisFin);
    const currentDate = new Date(current.moisFin);
    return currentDate > latestDate ? current : latest;
  });

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  const moisFin = new Date(dernierPaiement.moisFin);
  moisFin.setHours(23, 59, 59, 999);

  const dateGraceFin = new Date(dernierPaiement.dateGraceFin);
  dateGraceFin.setHours(23, 59, 59, 999);

  function calculerJours(date1, date2) {
    const diff = date2.getTime() - date1.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function formatDate(date) {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  if (aujourdhui <= moisFin) {
    // PÃ©riode active
    const joursRestants = calculerJours(aujourdhui, moisFin);
    
    if (joursRestants <= 15) {
      return {
        statut: 'EXPIRE_BIENTOT',
        couleur: 'yellow',
        message: `Expire le ${formatDate(moisFin)}`,
        acces: true,
        dateFin: moisFin.toISOString(),
        joursRestants,
      };
    }

    return {
      statut: 'ACTIF',
      couleur: 'green',
      message: `Paye jusqu'au ${formatDate(moisFin)}`,
      acces: true,
      dateFin: moisFin.toISOString(),
      joursRestants,
    };
  } else if (aujourdhui <= dateGraceFin) {
    // PÃ©riode de grÃ¢ce (5 jours)
    const joursGrace = calculerJours(aujourdhui, dateGraceFin);
    return {
      statut: 'RETARD',
      couleur: 'orange',
      message: `EN RETARD - ${joursGrace} jours de grace restants`,
      acces: true,
      dateFin: moisFin.toISOString(),
      joursRestants: -joursGrace,
    };
  } else {
    // ExpirÃ©
    const joursExpire = calculerJours(dateGraceFin, aujourdhui);
    return {
      statut: 'EXPIRE',
      couleur: 'red',
      message: `EXPIRE depuis ${joursExpire} jours`,
      acces: false,
      dateFin: moisFin.toISOString(),
      joursRestants: null,
    };
  }
}

/**
 * RÃ©cupÃ¨re les revenus encaissÃ©s pour un mois donnÃ©
 */
export async function getRevenusEncaisses(annee, mois) {
  const payments = await getAllPayments();
  const dateDebut = new Date(annee, mois - 1, 1);
  const dateFin = new Date(annee, mois, 0, 23, 59, 59, 999);

  const paiementsDuMois = payments.filter(p => {
    const datePaiement = new Date(p.dateEnregistrement);
    return datePaiement >= dateDebut && datePaiement <= dateFin;
  });

  const total = paiementsDuMois.reduce((sum, p) => sum + p.montantTotal, 0);

  return {
    total,
    paiements: paiementsDuMois,
  };
}

/**
 * RÃ©cupÃ¨re les revenus comptabilisÃ©s pour un mois donnÃ©
 */
export async function getRevenusComptabilises(annee, mois) {
  const payments = await getAllPayments();
  const dateDebut = new Date(annee, mois - 1, 1);
  const dateFin = new Date(annee, mois, 0, 23, 59, 59, 999);

  // Filtrer les paiements qui couvrent ce mois
  const paiementsActifs = payments.filter(p => {
    const moisDebut = new Date(p.moisDebut);
    const moisFin = new Date(p.moisFin);
    return moisDebut <= dateFin && moisFin >= dateDebut;
  });

  const total = paiementsActifs.reduce((sum, p) => sum + p.montantMensuel, 0);

  return {
    total,
    paiements: paiementsActifs,
  };
}

/**
 * Importe plusieurs Ã©tudiants en masse
 */
export async function importStudentsBulk(studentsData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez etre connecte');
  }

  const students = await getAllStudents();
  const newStudents = studentsData.map(studentData => ({
    id: studentData.id || `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nom: studentData.nom?.trim() || '',
    prenom: studentData.prenom?.trim() || '',
    classe: studentData.classe?.trim() || '',
    contact: studentData.contact?.trim() || '',
    dateCreation: studentData.dateCreation || new Date().toISOString(),
    creePar: studentData.creePar || {
      userId: currentUser.id,
      nom: currentUser.nom,
    },
    notes: studentData.notes?.trim() || '',
  }));

  // Fusionner avec les Ã©tudiants existants (Ã©viter les doublons par ID)
  const existingIds = new Set(students.map(s => s.id));
  const toAdd = newStudents.filter(s => !existingIds.has(s.id));
  const merged = [...students, ...toAdd];

  await setStorage(STUDENTS_KEY, merged);
  return toAdd.length;
}

/**
 * Importe plusieurs paiements en masse
 */
export async function importPaymentsBulk(paymentsData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez etre connecte');
  }

  const payments = await getAllPayments();
  const newPayments = paymentsData.map(paymentData => ({
    id: paymentData.id || `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    studentId: paymentData.studentId,
    montantTotal: Number(paymentData.montantTotal) || 0,
    nombreMois: Number(paymentData.nombreMois) || 1,
    moisDebut: paymentData.moisDebut || '',
    moisFin: paymentData.moisFin || '',
    dateGraceFin: paymentData.dateGraceFin || '',
    montantMensuel: Number(paymentData.montantMensuel) || 0,
    description: paymentData.description?.trim() || '',
    educateurNom: paymentData.educateurNom || currentUser.nom,
    educateurId: paymentData.educateurId || currentUser.id,
    dateEnregistrement: paymentData.dateEnregistrement || new Date().toISOString(),
  }));

  // Fusionner avec les paiements existants (Ã©viter les doublons par ID)
  const existingIds = new Set(payments.map(p => p.id));
  const toAdd = newPayments.filter(p => !existingIds.has(p.id));
  const merged = [...payments, ...toAdd];

  await setStorage(PAYMENTS_KEY, merged);
  return toAdd.length;
}

/**
 * Remplace toutes les donnÃ©es (utilisÃ© pour l'import complet)
 */
export async function replaceAllData({ students: newStudents, payments: newPayments }) {
  await setStorage(STUDENTS_KEY, newStudents || []);
  await setStorage(PAYMENTS_KEY, newPayments || []);
}

/**
 * Supprime tous les Ã©tudiants et paiements (mais pas les utilisateurs)
 */
export async function clearStudentsAndPayments() {
  try {
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (paymentsError) throw paymentsError;

    const { error: studentsError } = await supabase
      .from('subscribers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (studentsError) throw studentsError;
  } catch (error) {
    console.error('Erreur clearStudentsAndPayments (Supabase):', error);
    throw error;
  }

  await setStorage(STUDENTS_KEY, []);
  await setStorage(PAYMENTS_KEY, []);
}


