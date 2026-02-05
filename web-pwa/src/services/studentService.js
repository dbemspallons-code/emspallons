/**
 * Service de gestion des étudiants et paiements
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

/**
 * Structure étudiant:
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
 *   montantMensuel: number (calculé: montantTotal / nombreMois),
 *   description: string,
 *   educateurNom: string,
 *   educateurId: string,
 *   dateEnregistrement: string (ISO - date réelle du paiement)
 * }
 */

/**
 * Calcule les dates d'abonnement selon les règles:
 * - Toujours commencer le 1er du mois en cours
 * - Finir le dernier jour du dernier mois couvert
 * - Période de grâce: +5 jours après la fin
 */
function calculateSubscriptionDates(datePaiement, nombreMois) {
  const date = new Date(datePaiement);
  
  // Mois de début: toujours le 1er du mois en cours
  const moisDebut = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  
  // Mois de fin: dernier jour du dernier mois couvert
  const moisFin = new Date(date.getFullYear(), date.getMonth() + nombreMois, 0, 23, 59, 59, 999);
  
  // Date de fin de grâce configurable
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
 * Récupère tous les étudiants (Supabase `subscribers`)
 */
export async function getAllStudents() {
  try {
    const { data, error } = await supabase.from('subscribers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      nom: d.name,
      prenom: '',
      classe: d.class || '',
      contact: d.phone || d.email || '',
      dateCreation: d.created_at,
      status: d.status || 'active',
      raw: d,
    }));
  } catch (error) {
    console.error('Erreur getAllStudents (Supabase):', error);
    return [];
  }
}

/**
 * Récupère un étudiant par ID (Supabase)
 */
export async function getStudentById(id) {
  try {
    const { data, error } = await supabase.from('subscribers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      nom: data.name,
      prenom: '',
      classe: data.class || '',
      contact: data.phone || data.email || '',
      dateCreation: data.created_at,
      status: data.status || 'active',
      raw: data,
    };
  } catch (error) {
    console.error('Erreur getStudentById (Supabase):', error);
    return null;
  }
}

/**
 * Crée un nouvel étudiant
 */
export async function createStudent(studentData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez être connecté');
  }

  const newStudent = {
    name: studentData.nom.trim(),
    class: studentData.classe?.trim() || '',
    phone: studentData.contact?.trim() || null,
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
      console.warn('Génération QR échouée', error);
    }

    await historyService.log({
      type: 'STUDENT_CREATED',
      entityId: created.id,
      entityType: 'STUDENT',
      action: 'STUDENT_CREATED',
      details: {
        studentName: `${newStudent.name}`,
        classe: newStudent.class,
      },
    });

    return {
      id: created.id,
      nom: created.name,
      prenom: '',
      classe: created.class,
      contact: created.phone || created.email || '',
      dateCreation: created.created_at,
      raw: created,
    };
  } catch (error) {
    console.error('Erreur createStudent (Supabase):', error);
    throw error;
  }
}

/**
 * Met à jour un étudiant
 */
export async function updateStudent(studentId, updates) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez être connecté');
  }

  const updateData = {};
  if (updates.nom !== undefined) updateData.name = updates.nom.trim();
  if (updates.prenom !== undefined) updateData.name = (updateData.name ? `${updateData.name} ${updates.prenom.trim()}` : updates.prenom.trim());
  if (updates.classe !== undefined) updateData.class = updates.classe.trim();
  if (updates.contact !== undefined) updateData.phone = updates.contact.trim();
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
    throw error;
  }
}

/**
 * Supprime un étudiant
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
 * Récupère tous les paiements
 */
export async function getAllPayments() {
  try {
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur getAllPayments (Supabase):', error);
    return [];
  }
}

/**
 * Récupère les paiements d'un étudiant
 */
export async function getPaymentsByStudentId(studentId) {
  try {
    const { data, error } = await supabase.from('payments').select('*').eq('subscriber_id', studentId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur getPaymentsByStudentId (Supabase):', error);
    return [];
  }
}

/**
 * Crée un nouveau paiement
 */
export async function createPayment(paymentData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez être connecté');
  }

  // Vérifier que l'étudiant existe
  const student = await getStudentById(paymentData.studentId);
  if (!student) throw new Error('Étudiant introuvable');

  const { moisDebut, moisFin, dateGraceFin } = calculateSubscriptionDates(paymentData.dateEnregistrement || new Date().toISOString(), paymentData.nombreMois);

  const paymentRow = {
    subscriber_id: paymentData.studentId,
    amount: paymentData.montantTotal || paymentData.amount || 0,
    period_date: (paymentData.periodDate || moisDebut).slice(0, 10),
    method: paymentData.method || paymentData.paymentMethod || null,
    created_by: currentUser.id,
  };

  try {
    const { data, error } = await supabase.from('payments').insert([paymentRow]).select().maybeSingle();
    if (error) throw error;

    // Record subscription history
    try {
      await recordResubscription({
        studentId: paymentData.studentId,
        startDate: paymentData.dateEnregistrement || new Date().toISOString(),
        durationMonths: paymentData.nombreMois,
        amountPaid: paymentData.montantTotal || paymentData.amount || 0,
        paymentMethod: paymentData.method || paymentData.paymentMethod,
        busLine: paymentData.busLine || null,
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

    return data;
  } catch (error) {
    console.error('Erreur createPayment (Supabase):', error);
    throw error;
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
 * Calcule le statut d'un étudiant
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

  // Trouver le paiement avec la date de fin la plus éloignée
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
    // Période active
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
      message: `Payé jusqu'au ${formatDate(moisFin)}`,
      acces: true,
      dateFin: moisFin.toISOString(),
      joursRestants,
    };
  } else if (aujourdhui <= dateGraceFin) {
    // Période de grâce (5 jours)
    const joursGrace = calculerJours(aujourdhui, dateGraceFin);
    return {
      statut: 'RETARD',
      couleur: 'orange',
      message: `EN RETARD - ${joursGrace} jours de grâce restants`,
      acces: true,
      dateFin: moisFin.toISOString(),
      joursRestants: -joursGrace,
    };
  } else {
    // Expiré
    const joursExpire = calculerJours(dateGraceFin, aujourdhui);
    return {
      statut: 'EXPIRE',
      couleur: 'red',
      message: `EXPIRÉ depuis ${joursExpire} jours`,
      acces: false,
      dateFin: moisFin.toISOString(),
      joursRestants: null,
    };
  }
}

/**
 * Récupère les revenus encaissés pour un mois donné
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
 * Récupère les revenus comptabilisés pour un mois donné
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
 * Importe plusieurs étudiants en masse
 */
export async function importStudentsBulk(studentsData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez être connecté');
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

  // Fusionner avec les étudiants existants (éviter les doublons par ID)
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
    throw new Error('Vous devez être connecté');
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

  // Fusionner avec les paiements existants (éviter les doublons par ID)
  const existingIds = new Set(payments.map(p => p.id));
  const toAdd = newPayments.filter(p => !existingIds.has(p.id));
  const merged = [...payments, ...toAdd];

  await setStorage(PAYMENTS_KEY, merged);
  return toAdd.length;
}

/**
 * Remplace toutes les données (utilisé pour l'import complet)
 */
export async function replaceAllData({ students: newStudents, payments: newPayments }) {
  await setStorage(STUDENTS_KEY, newStudents || []);
  await setStorage(PAYMENTS_KEY, newPayments || []);
}

/**
 * Supprime tous les étudiants et paiements (mais pas les utilisateurs)
 */
export async function clearStudentsAndPayments() {
  await setStorage(STUDENTS_KEY, []);
  await setStorage(PAYMENTS_KEY, []);
}

