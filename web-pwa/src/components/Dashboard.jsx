import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Users, UserPlus, DollarSign, Calendar, AlertCircle, 
  Search, Filter, Download, Upload, Settings, HelpCircle, 
  Lock, Unlock, Plus, Edit2, Trash2, MessageCircle,
  BarChart3, TrendingUp, Clock, CheckCircle2, XCircle, History, QrCode, ShieldCheck,
  Bus, GraduationCap, RefreshCw, Archive
} from 'lucide-react';
import { logout, isAdmin } from '../services/authService';
import { getOutboxLength, triggerSync } from '../services/offlineService';
import { 
  getAllStudents, createStudent, updateStudent, deleteStudent,
  getAllPayments, createPayment, deletePayment, getPaymentsByStudentId,
  calculateStudentStatus, getRevenusEncaisses, getRevenusComptabilises,
  replaceAllData
} from '../services/studentService';
import { openWhatsAppWithMessage, openWhatsAppWithImage, normalizeWhatsAppNumber } from '../services/whatsappService';
import { logReminderSend } from '../services/reminderService';
import { fetchLatestSubscriptions } from '../services/subscriptionService';
import { exportStudentsCSV, exportStudentsXLSX, exportPaymentsCSV, exportPaymentsXLSX, exportAllJSON, importJSON, importStudentsCSV, importStudentsXLSX } from '../services/exportService';
import { clearStudentsAndPayments } from '../services/studentService';
import { qrCodeService } from '../services/qrCodeService';
import StudentFormModal from './StudentFormModal';
import PaymentFormModal from './PaymentFormModal';
import UserManagementModal from './UserManagementModal';
import MonthlyReport from './MonthlyReport';
import HelpTooltip from './HelpTooltip';
import HistoryViewer from './HistoryViewer';
import SettingsModal from './SettingsModal';
import NoticeModal from './NoticeModal';
import ControllerManagementModal from './ControllerManagementModal';
import WhatsAppReminderModal from './WhatsAppReminderModal';
import LineManager from './LineManager';
import ClassPromoManager from './ClassPromoManager';
import { fetchLines, saveLine, deleteLine } from '../services/firestoreService';

export default function Dashboard({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lineFilter, setLineFilter] = useState('all');
  const [promoFilter, setPromoFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [showControllerManagement, setShowControllerManagement] = useState(false);
  const [showLineManager, setShowLineManager] = useState(false);
  const [showClassPromoManager, setShowClassPromoManager] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [queuedCount, setQueuedCount] = useState(0);
  const [showQueuedToast, setShowQueuedToast] = useState(false);
  const [latestSubscriptions, setLatestSubscriptions] = useState([]);
  const [showWhatsAppReminders, setShowWhatsAppReminders] = useState(false);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    loadData();
    loadLines();
    checkAdminStatus();

    (async () => {
      try {
        const len = await getOutboxLength();
        if (typeof len === 'number' && len > 0) setQueuedCount(len);
      } catch (e) {}
    })();

    if (navigator && navigator.serviceWorker) {
      const onMessage = (event) => {
        const data = event.data || {};
        if (data.type === 'OUTBOX_ITEM_SYNCED') {
          setQueuedCount(c => Math.max(0, c - 1));
        } else if (data.type === 'OUTBOX_SYNC_COMPLETE') {
          setQueuedCount(data.remaining || 0);
        }
      };
      navigator.serviceWorker.addEventListener('message', onMessage);
      return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [studentsData, paymentsData, subscriptionsData] = await Promise.all([
        getAllStudents(),
        getAllPayments(),
        fetchLatestSubscriptions(),
      ]);
      setStudents(studentsData);
      setPayments(paymentsData);
      setLatestSubscriptions(subscriptionsData);
    } catch (error) {
      console.error('Erreur chargement donnees:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkAdminStatus() {
    const admin = await isAdmin();
    setIsAdminUser(admin);
  }

  async function loadLines() {
    try {
      const list = await fetchLines();
      setLines(Array.isArray(list) ? list : []);
    } catch (error) {
      console.warn('Impossible de charger les lignes:', error);
      setLines([]);
    }
  }

  async function handleSaveLine(lineData) {
    await saveLine(lineData);
    await loadLines();
  }

  async function handleDeleteLine(lineId) {
    await deleteLine(lineId);
    await loadLines();
  }

  const normalizeWhatsAppPhone = (value) => normalizeWhatsAppNumber(value, '225');

  const copyToClipboard = async (text) => {
    if (!text) return false;
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      // fallback below
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch (err) {
      return false;
    }
  };

  function buildReminderMessage({ studentName, expiresAtLabel, daysRemaining, type }) {
    if (type === 'expiring_today') {
      return `Bonjour ${studentName},\n\nVotre abonnement expire aujourd'hui (${expiresAtLabel}).\n\nMerci de renouveler pour continuer a beneficier du service.\n\nEMSP - Transport scolaire`;
    }
    if (type === 'expiring_soon') {
      return `Bonjour ${studentName},\n\nVotre abonnement expire dans ${daysRemaining} jour(s) (${expiresAtLabel}).\n\nMerci de renouveler pour eviter toute interruption.\n\nEMSP - Transport scolaire`;
    }
    return `Bonjour ${studentName},\n\nVotre abonnement a expire le ${expiresAtLabel}.\n\nVeuillez regulariser votre situation pour reactiver l'acces.\n\nEMSP - Transport scolaire`;
  }

  const latestSubscriptionByStudent = useMemo(() => {
    const map = {};
    latestSubscriptions.forEach((entry) => {
      if (entry.studentId) {
        map[entry.studentId] = entry;
      }
    });
    return map;
  }, [latestSubscriptions]);

  const lineLookup = useMemo(() => {
    return Object.fromEntries((lines || []).map(line => [line.id, line]));
  }, [lines]);

  const lineOptions = useMemo(() => {
    if (lines && lines.length) {
      return lines.map(line => ({ id: line.id, name: line.name }));
    }
    const seen = new Map();
    students.forEach(student => {
      const value = student.busLine || '';
      if (!value) return;
      if (!seen.has(value)) {
        seen.set(value, { id: value, name: value });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [lines, students]);

  const promoOptions = useMemo(() => {
    const values = new Set();
    students.forEach(student => {
      const value = (student.promo || student.niveau || '').trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);

  const classOptions = useMemo(() => {
    const values = new Set();
    students.forEach(student => {
      const value = (student.classe || student.classGroup || '').trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);

  const remindersQueue = useMemo(() => {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    return students
      .map((student) => {
        const subscription = latestSubscriptionByStudent[student.id];
        if (!subscription.expiresAt) return null;

        const phone = normalizeWhatsAppPhone(student.contact);
        if (!phone) return null;

        const expiresAt = new Date(subscription.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) return null;

        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / dayMs);
        let type = null;
        if (daysRemaining < 0) type = 'subscription_ended';
        else if (daysRemaining === 0) type = 'expiring_today';
        else if (daysRemaining <= 7) type = 'expiring_soon';
        else return null;

        const studentName = `${student.nom || ''} ${student.prenom || ''}`.trim() || student.nom || 'Etudiant';
        const expiresAtLabel = expiresAt.toLocaleDateString('fr-FR');

        const statusLabel = type === 'expiring_today'
          ? 'Expire aujourd\'hui'
          : type === 'expiring_soon'
            ? `Expire dans ${daysRemaining} jour(s)`
            : `Expire depuis ${Math.abs(daysRemaining)} jour(s)`;

        const message = buildReminderMessage({
          student,
          studentName,
          expiresAtLabel,
          daysRemaining,
          type,
        });

        const messagePreview = message.replace(/\n/g, ' ').slice(0, 180) + (message.length > 180 ? '...' : '');

        return {
          id: `${student.id}-${type}`,
          student,
          studentName,
          phone,
          expiresAt,
          expiresAtLabel,
          daysRemaining,
          type,
          statusLabel,
          message,
          messagePreview,
        };
      })
      .filter(Boolean);
  }, [students, latestSubscriptionByStudent]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const studentStatuses = students.map(s => {
      const studentPayments = payments.filter(p => p.studentId === s.id);
      return calculateStudentStatus(s, studentPayments);
    });

    const actifs = studentStatuses.filter(s => s.statut === 'ACTIF').length;
    const expireBientot = studentStatuses.filter(s => s.statut === 'EXPIRE_BIENTOT').length;
    const retard = studentStatuses.filter(s => s.statut === 'RETARD').length;
    const expire = studentStatuses.filter(s => s.statut === 'EXPIRE').length;
    const aucun = studentStatuses.filter(s => s.statut === 'AUCUN').length;

    return {
      total: students.length,
      actifs,
      expireBientot,
      retard,
      expire,
      aucun,
    };
  }, [students, payments]);

  // Filtrer les etudiants
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filtre de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const nom = (s.nom || '').toLowerCase();
        const prenom = (s.prenom || '').toLowerCase();
        const classe = (s.classe || s.classGroup || '').toLowerCase();
        const promo = (s.promo || s.niveau || '').toLowerCase();
        const lineId = (s.busLine || '').toLowerCase();
        const lineName = (lineLookup[s.busLine]?.name || '').toLowerCase();
        const contact = (s.contact || '').toLowerCase();
        return (
          nom.includes(term) ||
          prenom.includes(term) ||
          classe.includes(term) ||
          promo.includes(term) ||
          lineId.includes(term) ||
          lineName.includes(term) ||
          contact.includes(term)
        );
      });
    }

    // Filtre de statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => {
        const studentPayments = payments.filter(p => p.studentId === s.id);
        const status = calculateStudentStatus(s, studentPayments);
        return status.statut === statusFilter;
      });
    }

    if (lineFilter !== 'all') {
      filtered = filtered.filter(s => (s.busLine || '') === lineFilter);
    }

    if (promoFilter !== 'all') {
      filtered = filtered.filter(s => (s.promo || s.niveau || '').toLowerCase() === promoFilter.toLowerCase());
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter(s => (s.classe || s.classGroup || '').toLowerCase() === classFilter.toLowerCase());
    }

    return filtered;
  }, [students, payments, searchTerm, statusFilter, lineFilter, promoFilter, classFilter, lineLookup]);

  const resetStudentFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setLineFilter('all');
    setPromoFilter('all');
    setClassFilter('all');
  };

  async function handleSaveStudent(studentData) {
    try {
      if (selectedStudent && selectedStudent.id) {
        // Mise a jour
        await updateStudent(selectedStudent.id, studentData);
      } else {
        // Creation
        await createStudent(studentData);
      }
      await loadData();
      setShowStudentForm(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Erreur sauvegarde etudiant:', error);
      throw error;
    }
  }

  async function handleCreatePayment(paymentData) {
    try {
      const newPayment = await createPayment({
        ...paymentData,
        busLine: selectedStudent?.busLine || null,
      });
      await loadData();
      setShowPaymentForm(false);
      setSelectedStudent(null);
      return newPayment;
    } catch (error) {
      console.error('Erreur creation paiement:', error);
      throw error;
    }
  }

  async function handleDeleteStudent(studentId) {
    if (!window.confirm('Etes-vous sur de vouloir supprimer cet etudiant ?')) {
      return;
    }
    try {
      await deleteStudent(studentId);
      await loadData();
    } catch (error) {
      console.error('Erreur suppression etudiant:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function handleDownloadQRCard(student) {
    try {
      let qrImage = student.qrCode;
      let qrCard = student.qrCard;
      let payloadToken = student.qrToken;
      let payloadGeneratedAt = student.qrGeneratedAt;

      if (!qrImage || !qrCard) {
        const { qrImage: generatedQrImage, payload } = await qrCodeService.generateStudentQR(student);
        const printableCard = await qrCodeService.generatePrintableCard(student, generatedQrImage);
        qrImage = generatedQrImage;
        qrCard = printableCard;
        payloadToken = payload.token;
        payloadGeneratedAt = payload.generatedAt;
        await updateStudent(student.id, {
          qrCode: qrImage,
          qrCard: qrCard,
          qrToken: payloadToken,
          qrGeneratedAt: payloadGeneratedAt,
        });
        await loadData();
      }

      if (!qrCard) {
        throw new Error('Carte QR indisponible');
      }

      const link = document.createElement('a');
      const safeName = `${student.nom || 'etudiant'}-${student.prenom || ''}`.trim().replace(/\s+/g, '_');
      link.href = qrCard;
      link.download = `carte_${safeName || student.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage('Carte QR telechargee avec succes');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur telechargement carte QR:', error);
      setMessage(`Erreur telechargement carte QR: ${error.message || 'Action impossible'}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleRegenerateQR(student) {
    if (!student.id) return;
    const fullName = `${student.nom || ''} ${student.prenom || ''}`.trim() || 'cet etudiant';
    if (!window.confirm(`Regenerer le QR code pour ${fullName} `)) return;
    try {
      const payloadStudent = { ...student, qrToken: null };
      const { qrImage, payload } = await qrCodeService.generateStudentQR(payloadStudent);
      const qrCard = await qrCodeService.generatePrintableCard(payloadStudent, qrImage);
      await updateStudent(student.id, {
        qrCode: qrImage,
        qrCard,
        qrToken: payload.token || null,
        qrGeneratedAt: payload.generatedAt || null,
      });
      await loadData();
      setMessage('QR code regenere avec succes');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur regeneration QR:', error);
      setMessage(`Erreur regeneration QR: ${error.message || 'Action impossible'}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleSendQrWhatsApp(student) {
    const phone = normalizeWhatsAppPhone(student.contact);
    if (!phone) {
      setMessage('Numero WhatsApp manquant ou invalide.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const studentName = `${student.nom || ''} ${student.prenom || ''}`.trim() || student.nom || 'Etudiant';
      const temp = { id: student.id, nom: student.nom, prenom: student.prenom, classe: student.classe, contact: student.contact };
      const { qrImage } = await qrCodeService.generateStudentQR(temp);
      const qrCard = await qrCodeService.generatePrintableCard(temp, qrImage);

      const message = `Bonjour ${studentName},\n\nVoici votre QR code d'acces au transport scolaire.\n\nMerci de le conserver et de le presenter lors du scan.\n\nEMSP - Transport scolaire`;
      await copyToClipboard(message);
      setMessage('Message WhatsApp copie. Ajoutez le QR telecharge dans WhatsApp.');
      setTimeout(() => setMessage(''), 4000);
      openWhatsAppWithImage(phone, message, qrCard || qrImage);

      await logReminderSend({
        studentId: student.id,
        studentName,
        studentContact: phone,
        reminderType: 'qr_send',
        message,
        status: 'sent',
        sendResult: 'whatsapp_opened',
        createdBy: user.id || null,
      });
    } catch (error) {
      console.error('Erreur envoi QR WhatsApp:', error);
      setMessage(`Erreur envoi QR WhatsApp: ${error.message || 'Action impossible'}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleSendReminderWhatsApp(reminder) {
    try {
      openWhatsAppWithMessage(reminder.phone, reminder.message);
      await logReminderSend({
        studentId: reminder.student.id,
        studentName: reminder.studentName,
        studentContact: reminder.phone,
        reminderType: reminder.type,
        message: reminder.message,
        status: 'sent',
        sendResult: 'whatsapp_opened',
        createdBy: user.id || null,
      });
    } catch (error) {
      console.warn('Erreur envoi rappel WhatsApp:', error);
    }
  }

  async function handleCopyReminderMessage(reminder) {
    const ok = await copyToClipboard(reminder.message);
    if (ok) {
      setMessage('Message WhatsApp copie dans le presse-papiers.');
    } else {
      setMessage('Impossible de copier le message.');
    }
    setTimeout(() => setMessage(''), 2500);
  }

  async function handleSendAllReminders() {
    if (remindersQueue.length === 0) return;
    if (!window.confirm(`Ouvrir WhatsApp pour ${remindersQueue.length} rappel(s) `)) return;
    let index = 0;
    setMessage('Ouverture des conversations WhatsApp...');
    for (const reminder of remindersQueue) {
      index += 1;
      setMessage(`Ouverture WhatsApp ${index}/${remindersQueue.length}`);
      await handleSendReminderWhatsApp(reminder);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleExportStudents() {
    try {
      await exportStudentsCSV({ students: filteredStudents, payments, lines });
      setMessage('Export CSV des etudiants reussi (Excel)');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur export: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleExportStudentsXLSX() {
    try {
      await exportStudentsXLSX({ students: filteredStudents, payments, lines });
      setMessage('Export Excel des etudiants reussi');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur export: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleExportPayments() {
    try {
      await exportPaymentsCSV();
      setMessage('Export CSV des paiements reussi');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur export: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleExportPaymentsXLSX() {
    try {
      await exportPaymentsXLSX();
      setMessage('Export Excel des paiements reussi');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur export: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleExportAll() {
    try {
      await exportAllJSON();
      setMessage('Export JSON complet reussi');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur export: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleAnnualArchive() {
    if (!window.confirm('Archiver l\'annee en cours  Un export complet sera telecharge puis les etudiants et paiements seront supprimes.')) {
      return;
    }

    try {
      await exportAllJSON();
      await clearStudentsAndPayments();
      await loadData();
      resetStudentFilters();
      setMessage('Archivage annuel effectue. Nouvelle annee prete.');
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(`Erreur archivage: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleImportJSON(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const data = await importJSON(file);
      
      // Demander confirmation avant d'importer
      if (!window.confirm(
        `Importer ${data.students.length} etudiant(s) et ${data.payments.length} paiement(s) \n\n` +
        `ATTENTION: Cela remplacera toutes les donnees existantes !`
      )) {
        return;
      }

      // Importer les donnees
      setMessage('Import en cours...');
      await replaceAllData({
        students: data.students || [],
        payments: data.payments || [],
      });
      setMessage(`Import reussi: ${data.students.length} etudiant(s) et ${data.payments.length} paiement(s)`);
      await loadData();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(`Erreur import: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
      event.target.value = ''; // Reinitialiser l'input
    }
  }

  async function handleImportCSV(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const studentsData = await importStudentsCSV(file);
      
      if (!window.confirm(
        `Importer ${studentsData.length} etudiant(s) `
      )) {
        return;
      }

      // Creer les etudiants
      for (const studentData of studentsData) {
        try {
          await createStudent(studentData);
        } catch (error) {
          console.error('Erreur creation etudiant:', error);
        }
      }

      setMessage(`${studentsData.length} etudiant(s) importe(s) avec succes`);
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur import: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  async function handleImportXLSX(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const studentsData = await importStudentsXLSX(file);

      if (!window.confirm(
        `Importer ${studentsData.length} etudiant(s) `
      )) {
        return;
      }

      for (const studentData of studentsData) {
        try {
          await createStudent(studentData);
        } catch (error) {
          console.error('Erreur creation etudiant:', error);
        }
      }

      setMessage(`${studentsData.length} etudiant(s) importe(s) avec succes`);
      await loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur import: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  async function handleReset() {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    // Double confirmation
    const confirmText = 'EFFACER TOUT';
    const userInput = window.prompt(
      `ATTENTION: Cette action est IRREVERSIBLE !\n\n` +
      `Toutes les donnees seront supprimees :\n` +
      `- Tous les etudiants\n` +
      `- Tous les paiements\n\n` +
      `Les utilisateurs ne seront PAS supprimes.\n\n` +
      `Tapez "${confirmText}" pour confirmer :`
    );

    if (userInput !== confirmText) {
      setShowResetConfirm(false);
      setMessage('Reinitialisation annulee');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setLoading(true);
      await clearStudentsAndPayments();
      setMessage('Toutes les donnees ont ete supprimees. Rechargement...');
      await loadData();
      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage(`Erreur reinitialisation: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
      setShowResetConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg">
      {/* Header */}
      <header className="glass-panel top-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="top-nav__layout">
            <div className="top-nav__row">
              <div className="top-nav__brand">
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-green-500 bg-clip-text text-transparent brand-title">
                    EMSP Allons
                  </h1>
                  <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Back-office</p>
                </div>
              </div>
              <div className="top-nav__user">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.nom || user.name || user.email || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500">{user.role === 'admin' ? 'Administrateur' : 'Educateur'}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="nav-action nav-action--danger text-sm font-medium"
                >
                  <LogOut className="w-4 h-4 inline mr-2" />
                  Deconnexion
                </button>
              </div>
            </div>

            <div className="top-nav__actions">
              <button
                onClick={() => setShowControllerManagement(true)}
                className="nav-action text-sm font-medium"
                title="Gerer les controleurs"
              >
                <ShieldCheck className="w-4 h-4 inline mr-2" />
                Controleurs
              </button>
              <button
                onClick={() => setShowLineManager(true)}
                className="nav-action text-sm font-medium"
                title="Gerer les lignes"
              >
                <Bus className="w-4 h-4 inline mr-2" />
                Lignes
              </button>
              <button
                onClick={() => setShowClassPromoManager(true)}
                className="nav-action text-sm font-medium"
                title="Gerer classes et promos"
              >
                <GraduationCap className="w-4 h-4 inline mr-2" />
                Classes & Promos
              </button>
              <button
                onClick={() => setShowNotice(true)}
                className="nav-action text-sm font-medium"
                title="Notice d'utilisation"
              >
                <HelpCircle className="w-4 h-4 inline mr-2" />
                Notice
              </button>
              <button
                onClick={() => setShowWhatsAppReminders(true)}
                className="nav-action text-sm font-medium"
                title="Rappels WhatsApp"
              >
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Rappels
              </button>
              {isAdminUser && (
                <>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="nav-action text-sm font-medium"
                    title="Parametres"
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Parametres
                  </button>
                  <div className="relative">
                    <button
                      onClick={handleExportAll}
                      className="nav-action text-sm font-medium"
                      title="Exporter toutes les donnees"
                    >
                      <Download className="w-4 h-4 inline mr-2" />
                      Export
                    </button>
                  </div>
                  <label className="nav-action text-sm font-medium cursor-pointer">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Import
                    <input
                      type="file"
                      accept=".json,.csv,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        if (file.name.endsWith('.json')) {
                          handleImportJSON(e);
                        } else if (file.name.endsWith('.csv')) {
                          handleImportCSV(e);
                        } else if (file.name.endsWith('.xlsx')) {
                          handleImportXLSX(e);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleAnnualArchive}
                    className="nav-action text-sm font-medium"
                    title="Archiver l'annee"
                  >
                    <Archive className="w-4 h-4 inline mr-2" />
                    Archiver annee
                  </button>
                  <button
                    onClick={() => setShowUserManagement(true)}
                    className="nav-action text-sm font-medium"
                  >
                    <Users className="w-4 h-4 inline mr-2" />
                    Utilisateurs
                  </button>
                </>
              )}

              {queuedCount > 0 && (
                <button
                  onClick={() => {
                    triggerSync();
                    setShowQueuedToast(true);
                    setTimeout(() => setShowQueuedToast(false), 3000);
                  }}
                  className="nav-pill inline-flex items-center gap-2"
                  title="Operations en file (cliquer pour synchroniser)"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10v6a2 2 0 0 1-2 2H7" />
                    <path d="M3 6v6a2 2 0 0 0 2 2h12" />
                  </svg>
                  <span className="text-sm font-semibold">{queuedCount}</span>
                </button>
              )}

              {showQueuedToast && (
                <div className="ui-toast fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                  Synchronisation demandee
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-bar glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="nav-tabs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`nav-tab ${activeTab === 'dashboard' ? 'nav-tab--active' : ''}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Apercu
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`nav-tab ${activeTab === 'students' ? 'nav-tab--active' : ''}`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Etudiants
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`nav-tab ${activeTab === 'monthly' ? 'nav-tab--active' : ''}`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Bilan mensuel
            </button>
            {isAdminUser && (
              <button
                onClick={() => setActiveTab('history')}
                className={`nav-tab ${activeTab === 'history' ? 'nav-tab--active' : ''}`}
              >
                <History className="w-4 h-4 inline mr-2" />
                Archives
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className={`p-4 rounded-lg ${
            message.includes('reussi') || message.includes('succes')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.includes('Erreur') || message.includes('annulee')
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}>
            {message}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView 
            stats={stats}
            students={students}
            payments={payments}
            onAddStudent={() => setShowStudentForm(true)}
            onAddPayment={(student) => {
              setSelectedStudent(student);
              setShowPaymentForm(true);
            }}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView
            students={filteredStudents}
            payments={payments}
            lines={lines}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            lineFilter={lineFilter}
            promoFilter={promoFilter}
            classFilter={classFilter}
            onLineFilterChange={setLineFilter}
            onPromoFilterChange={setPromoFilter}
            onClassFilterChange={setClassFilter}
            lineOptions={lineOptions}
            promoOptions={promoOptions}
            classOptions={classOptions}
            onResetFilters={resetStudentFilters}
            onAddStudent={() => setShowStudentForm(true)}
            onEditStudent={(student) => {
              setSelectedStudent(student);
              setShowStudentForm(true);
            }}
            onDeleteStudent={handleDeleteStudent}
            onAddPayment={(student) => {
              setSelectedStudent(student);
              setShowPaymentForm(true);
            }}
            onExportStudents={isAdminUser ? handleExportStudents : undefined}
            onExportStudentsXLSX={isAdminUser ? handleExportStudentsXLSX : undefined}
            onExportPayments={isAdminUser ? handleExportPayments : undefined}
            onExportPaymentsXLSX={isAdminUser ? handleExportPaymentsXLSX : undefined}
            onDownloadQR={handleDownloadQRCard}
            onRegenerateQR={handleRegenerateQR}
            onSendQrWhatsApp={handleSendQrWhatsApp}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyReport
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            students={students}
            payments={payments}
            lines={lines}
          />
        )}
        {activeTab === 'history' && isAdminUser && (
          <HistoryViewer />
        )}
      </main>

      {/* Modals */}
      {showStudentForm && (
        <StudentFormModal
          student={selectedStudent}
          onClose={() => {
            setShowStudentForm(false);
            setSelectedStudent(null);
          }}
          onSave={handleSaveStudent}
        />
      )}

      {showPaymentForm && (
        <PaymentFormModal
          student={selectedStudent}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedStudent(null);
          }}
          onSave={handleCreatePayment}
        />
      )}

      {showUserManagement && isAdminUser && (
        <UserManagementModal
          onClose={() => setShowUserManagement(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false);
            setShowResetConfirm(false);
          }}
          isAdmin={isAdminUser}
          onReset={handleReset}
          showResetConfirm={showResetConfirm}
        />
      )}

      {showNotice && (
        <NoticeModal
          isOpen={showNotice}
          onClose={() => setShowNotice(false)}
        />
      )}

      {showControllerManagement && (
        <ControllerManagementModal
          onClose={() => setShowControllerManagement(false)}
        />
      )}

      {showLineManager && (
        <LineManager
          lines={lines}
          onSave={handleSaveLine}
          onDelete={handleDeleteLine}
          onClose={() => setShowLineManager(false)}
        />
      )}

      {showClassPromoManager && (
        <ClassPromoManager
          onClose={() => setShowClassPromoManager(false)}
        />
      )}

      {showWhatsAppReminders && (
        <WhatsAppReminderModal
          open={showWhatsAppReminders}
          reminders={remindersQueue}
          onClose={() => setShowWhatsAppReminders(false)}
          onSendOne={handleSendReminderWhatsApp}
          onSendAll={handleSendAllReminders}
          onCopyMessage={handleCopyReminderMessage}
        />
      )}
    </div>
  );
}

// Composant DashboardView
function DashboardView({ stats, students, payments, onAddStudent, onAddPayment }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total etudiants"
          value={stats.total}
          icon={Users}
          color="blue"
        />
        <KPICard
          title="Actifs"
          value={stats.actifs}
          icon={CheckCircle2}
          color="green"
        />
        <KPICard
          title="Expire bientot"
          value={stats.expireBientot}
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="En retard"
          value={stats.retard}
          icon={AlertCircle}
          color="orange"
        />
        <KPICard
          title="Expires"
          value={stats.expire}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Actions rapides */}
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="flex gap-4">
          <button
            onClick={onAddStudent}
            className="ui-btn ui-btn--primary px-4 py-2"
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Ajouter un etudiant
          </button>
        </div>
      </div>

      {/* Alertes */}
      <AlertsView students={students} payments={payments} onAddPayment={onAddPayment} />
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="ui-card kpi-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function AlertsView({ students, payments, onAddPayment }) {
  const alerts = useMemo(() => {
    const alertsList = [];
    
    students.forEach(student => {
      const studentPayments = payments.filter(p => p.studentId === student.id);
      const status = calculateStudentStatus(student, studentPayments);
      
      if (status.statut === 'EXPIRE_BIENTOT' || status.statut === 'RETARD' || status.statut === 'EXPIRE') {
        alertsList.push({ student, status });
      }
    });

    return alertsList.sort((a, b) => {
      const priority = { EXPIRE: 3, RETARD: 2, EXPIRE_BIENTOT: 1 };
      return (priority[b.status.statut] || 0) - (priority[a.status.statut] || 0);
    });
  }, [students, payments]);

  if (alerts.length === 0) {
    return (
      <div className="ui-card p-6">
        <h2 className="text-lg font-semibold mb-4">Alertes</h2>
        <p className="text-gray-500">Aucune alerte pour le moment</p>
      </div>
    );
  }

  return (
    <div className="ui-card p-6">
      <h2 className="text-lg font-semibold mb-4">Alertes</h2>
      <div className="space-y-3">
        {alerts.map(({ student, status }) => (
          <div
            key={student.id}
            className={`p-4 rounded-lg border-l-4 ${
              status.statut === 'EXPIRE' ? 'bg-red-50 border-red-500' :
              status.statut === 'RETARD' ? 'bg-orange-50 border-orange-500' :
              'bg-yellow-50 border-yellow-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {student.nom} {student.prenom}
                </p>
                <p className="text-sm text-gray-600">{status.message}</p>
              </div>
              <button
                onClick={() => onAddPayment(student)}
                className="ui-btn ui-btn--soft px-3 py-1 text-sm"
              >
                Payer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Composant StudentsView
function StudentsView({
  students,
  payments,
  lines = [],
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  lineFilter,
  promoFilter,
  classFilter,
  onLineFilterChange,
  onPromoFilterChange,
  onClassFilterChange,
  lineOptions = [],
  promoOptions = [],
  classOptions = [],
  onResetFilters,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onAddPayment,
  onExportStudents,
  onExportStudentsXLSX,
  onExportPayments,
  onExportPaymentsXLSX,
  onDownloadQR,
  onRegenerateQR,
  onSendQrWhatsApp,
}) {
  const lineLookup = useMemo(() => {
    return Object.fromEntries((lines || []).map(line => [line.id, line]));
  }, [lines]);

  const resolvedLineOptions = lineOptions.length ? lineOptions : lines;

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="ui-card p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher un etudiant (nom, promo, classe, ligne)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="min-w-[170px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="ACTIF">Actifs</option>
            <option value="EXPIRE_BIENTOT">Expire bientot</option>
            <option value="RETARD">En retard</option>
            <option value="EXPIRE">Expires</option>
            <option value="AUCUN">Aucun abonnement</option>
          </select>
          <select
            value={lineFilter}
            onChange={(e) => onLineFilterChange(e.target.value)}
            className="min-w-[170px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="all">Toutes les lignes</option>
            {resolvedLineOptions.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
          <select
            value={promoFilter}
            onChange={(e) => onPromoFilterChange(e.target.value)}
            className="min-w-[170px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="all">Toutes les promos</option>
            {promoOptions.map((promo) => (
              <option key={promo} value={promo}>
                {promo}
              </option>
            ))}
          </select>
          <select
            value={classFilter}
            onChange={(e) => onClassFilterChange(e.target.value)}
            className="min-w-[170px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="all">Toutes les classes</option>
            {classOptions.map((classe) => (
              <option key={classe} value={classe}>
                {classe}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Reinitialiser filtres
            </button>
          )}
          <button
            onClick={onAddStudent}
            className="ui-btn ui-btn--primary px-4 py-2"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Ajouter
          </button>
          {onExportStudents && (
            <button
              onClick={onExportStudents}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              title="Exporter les etudiants en CSV"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export CSV
            </button>
          )}
          {onExportStudentsXLSX && (
            <button
              onClick={onExportStudentsXLSX}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              title="Exporter les etudiants en Excel"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export Excel
            </button>
          )}
          {onExportPayments && (
            <button
              onClick={onExportPayments}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              title="Exporter les paiements en CSV"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export Paiements
            </button>
          )}
          {onExportPaymentsXLSX && (
            <button
              onClick={onExportPaymentsXLSX}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              title="Exporter les paiements en Excel"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export Paiements Excel
            </button>
          )}
        </div>
      </div>

      {/* Liste des etudiants */}
      <div className="ui-card table-card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Etudiant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Classe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ligne
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map(student => {
              const studentPayments = payments.filter(p => p.studentId === student.id);
              const status = calculateStudentStatus(student, studentPayments);
              
              return (
                <StudentRow
                  key={student.id}
                  student={student}
                  status={status}
                  onEdit={onEditStudent}
                  onDelete={onDeleteStudent}
                  onAddPayment={onAddPayment}
                  onDownloadQR={onDownloadQR}
                  onRegenerateQR={onRegenerateQR}
                  onSendQrWhatsApp={onSendQrWhatsApp}
                  lineName={(lineLookup[student.busLine]?.name || student.busLine || '')}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentRow({
  student,
  status,
  onEdit,
  onDelete,
  onAddPayment,
  onDownloadQR,
  onRegenerateQR,
  onSendQrWhatsApp,
  lineName,
}) {
  const statusColors = {
    ACTIF: 'bg-green-100 text-green-800',
    EXPIRE_BIENTOT: 'bg-yellow-100 text-yellow-800',
    RETARD: 'bg-orange-100 text-orange-800',
    EXPIRE: 'bg-red-100 text-red-800',
    AUCUN: 'bg-gray-100 text-gray-800',
  };

  const statusIcons = {
    ACTIF: CheckCircle2,
    EXPIRE_BIENTOT: Clock,
    RETARD: AlertCircle,
    EXPIRE: XCircle,
    AUCUN: XCircle,
  };

  const StatusIcon = statusIcons[status.statut] || XCircle;

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {student.nom} {student.prenom}
          </div>
          <div className="text-sm text-gray-500">{student.contact}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div>{student.classe || 'N/A'}</div>
        {student.promo && <div className="text-xs text-gray-400">{student.promo}</div>}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {lineName || 'N/A'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status.statut]}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.message}
        </span>
        {status.acces ? (
          <Unlock className="w-4 h-4 text-green-500 inline ml-2" />
        ) : (
          <Lock className="w-4 h-4 text-red-500 inline ml-2" />
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddPayment(student)}
            className="text-yellow-600 hover:text-yellow-900"
            title="Ajouter un paiement"
          >
            <DollarSign className="w-4 h-4" />
          </button>
          {onDownloadQR && (
            <button
              onClick={() => onDownloadQR(student)}
              className="text-purple-600 hover:text-purple-900"
              title="Telecharger la carte QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
          {onRegenerateQR && (
            <button
              onClick={() => onRegenerateQR(student)}
              className="text-indigo-600 hover:text-indigo-900"
              title="Regenerer le QR"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {onSendQrWhatsApp && (
            <button
              onClick={() => onSendQrWhatsApp(student)}
              className="text-emerald-600 hover:text-emerald-900"
              title="Envoyer QR par WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(student)}
            className="text-gray-600 hover:text-gray-900"
            title="Modifier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(student.id)}
            className="text-gray-500 hover:text-red-600"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}


