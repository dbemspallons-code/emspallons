import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Bus, Download, Filter, RefreshCcw, ShieldCheck, ShieldX, Settings, Bell, Users, Upload, UserCheck, BarChart2, HelpCircle, UserCog, LogOut, Crown, Plus, Edit2, Trash2, X, Save, AlertTriangle, GraduationCap, Calendar, DollarSign, Key, Eye, EyeOff } from 'lucide-react';
import StudentForm from './StudentForm.jsx';
import StudentList from './StudentList.jsx';
import SummaryCards from './SummaryCards.jsx';
import PaymentModal from './PaymentModal.jsx';
import StatusModal from './StatusModal.jsx';
import LineManager from './LineManager.jsx';
import ReminderModal from './ReminderModal.jsx';
import ControllerManager from './ControllerManager.jsx';
import MonthlyReports from './MonthlyReports.jsx';
import SettingsModal from './SettingsModal.jsx';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import ClassPromoManager from './ClassPromoManager.jsx';
import ResubscriptionModal from './ResubscriptionModal.jsx';
import OutOfServiceMonthsManager from './OutOfServiceMonthsManager.jsx';
import RemindersConfigModal from './RemindersConfigModal.jsx';
import ReminderSenderModal from './ReminderSenderModal.jsx';
import ScanHistoryViewer from './ScanHistoryViewer.jsx';
import AccountingModule from './AccountingModule.jsx';
import { openWhatsAppWithMessage, openWhatsAppWithImage } from '../services/whatsappService';
import { sendPaymentConfirmation, checkAndSendAutomaticNotifications } from '../services/notificationsService';
import { exportSubscribersCSV } from '../services/exportCSV';
import { createBackup, getBackupHistory, exportBackupToCSV, initAutomaticBackup } from '../services/backupService';
import { importStudentsFromCSV } from '../services/importCSV';
import { exportAllJSON } from '../services/exportService';
import { clearStudentsAndPayments } from '../services/studentService';
import { useStudents } from '../hooks/useStudents';
import { createController, updateController, deleteController, subscribeControllers, resetTodayScanLogs, fetchGlobalSettings, setPausePlatform, saveGlobalSettings, logEducatorActivity, fetchEducatorActivity, fetchUsers, subscribeUsers, createUser, updateUser, deleteUser, recordPaymentV2, fetchPaymentsByMonth, fetchActivePaymentsForMonth } from '../services/firestoreService';
import { changeOwnPassword, resetUserPassword } from '../services/authService';
import { BUS_LINES, PAYMENT_STATUS, SUBSCRIPTION_PLANS, isSubscriptionActive, computePaymentStatus } from '../models/entities';
import { useAuth } from '../context/AuthContext';

export default function BusManagementCore() {
  const { user: currentUser } = useAuth();
  const hookResult = useStudents();
  const {
    students = [],
    lines = BUS_LINES,
    loading = false,
    error = null,
    synced = false,
    addStudent = () => Promise.resolve(),
    deleteStudent = () => Promise.resolve(),
    toggleStatus = () => Promise.resolve(),
    updateStudent = () => Promise.resolve(),
    registerPayment = () => Promise.resolve(),
    refreshPass = () => Promise.resolve(),
    revokePass = () => Promise.resolve(),
    saveLine = () => Promise.resolve(),
    deleteLine = () => Promise.resolve(),
  } = hookResult || {};

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    line: 'all',
    promo: 'all',
    classGroup: 'all',
  });
  const [messageStatus, setMessageStatus] = useState('');
  const [processingPassId, setProcessingPassId] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [initialPaymentDate, setInitialPaymentDate] = useState(null);
  const [initialMonths, setInitialMonths] = useState(null);
  const [paymentMode, setPaymentMode] = useState('paiement');
  const [statusTarget, setStatusTarget] = useState(null);
  const [showLineManager, setShowLineManager] = useState(false);
  const [showControllerManager, setShowControllerManager] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showMonthlyReports, setShowMonthlyReports] = useState(false);
  const [showMonthlyBalance, setShowMonthlyBalance] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState(12500);
  const [alertThreshold, setAlertThreshold] = useState(20);
  const [vacationMessage, setVacationMessage] = useState('Plateforme en pause (vacances).');
  const [pausedMonths, setPausedMonths] = useState([]);
  const [importProgress, setImportProgress] = useState(null);
  const [controllers, setControllers] = useState([]);
  const [pausePlatform, setPause] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [activeHelp, setActiveHelp] = useState('payment');
  const [showUserManager, setShowUserManager] = useState(false);
  const [showClassPromoManager, setShowClassPromoManager] = useState(false);
  const [showResubscriptionModal, setShowResubscriptionModal] = useState(false);
  const [resubscriptionStudent, setResubscriptionStudent] = useState(null);
  const [showOutOfServiceMonths, setShowOutOfServiceMonths] = useState(false);
  const [showRemindersConfig, setShowRemindersConfig] = useState(false);
  const [showReminderSender, setShowReminderSender] = useState(false);
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [showAccounting, setShowAccounting] = useState(false);
  const [users, setUsers] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Vérifier si l'utilisateur est Admin
  const isAdmin = currentUser?.role === 'admin';
  const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Utilisateur';
  const userRole = currentUser?.role === 'admin' ? 'Admin' : 'Éducateur';
  
  // S'abonner aux utilisateurs (Admin seulement)
  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeUsers(setUsers);
    return unsubscribe;
  }, [isAdmin]);

  const loadRecentActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      setActivityError(null);
      const list = await fetchEducatorActivity({ limitCount: 25 });
      setActivities(list);
    } catch (err) {
      console.warn('Erreur chargement historique activités:', err);
      setActivityError(err.message || 'Impossible de charger l’historique des actions.');
    } finally {
      setActivityLoading(false);
    }
  }, []);
  
  // Vérifier automatiquement les statuts avec période de grâce
  useEffect(() => {
    if (!students.length || !updateStudent) return;
    
    const checkStatuses = async () => {
      for (const student of students) {
        try {
          const computedStatus = await computePaymentStatus(student);
          if (student.paymentStatus !== computedStatus && computedStatus === PAYMENT_STATUS.OUT_OF_SERVICE) {
            // Mettre à jour automatiquement le statut après la période de grâce
            updateStudent(student.id, { paymentStatus: computedStatus }).catch(err => {
              console.warn('Erreur mise à jour automatique statut:', err);
            });
          }
        } catch (err) {
          console.warn(`Erreur calcul statut pour ${student.name}:`, err);
        }
      }
    };
    
    // Vérifier toutes les heures
    const interval = setInterval(checkStatuses, 60 * 60 * 1000);
    checkStatuses(); // Vérifier immédiatement
    
    return () => clearInterval(interval);
  }, [students, updateStudent]);

  // S'abonner aux contrôleurs
  useEffect(() => {
    const unsubscribe = subscribeControllers(setControllers);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchGlobalSettings();
        setPause(!!s.pausePlatform);
        setDefaultMonthlyFee(s.defaultMonthlyFee ?? 12500);
        setAlertThreshold(s.alertThreshold ?? 20);
        setVacationMessage(s.vacationMessage ?? 'Plateforme en pause (vacances).');
        setPausedMonths(Array.isArray(s.pausedMonths) ? s.pausedMonths : []);
      } catch {}
    })();
    
    // Initialiser le système de backup automatique
    initAutomaticBackup();
  }, []);

  useEffect(() => {
    loadRecentActivity();
  }, [loadRecentActivity]);

  const lineOptions = lines?.length ? lines : BUS_LINES;
  const promoOptions = useMemo(() => {
    const values = new Set();
    (students || []).forEach(student => {
      const value = (student?.niveau || student?.promo || '').trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);
  const classOptions = useMemo(() => {
    const values = new Set();
    (students || []).forEach(student => {
      const value = (student?.classGroup || student?.classe || '').trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);

  const educatorLog = useCallback(async (entry = {}) => {
    try {
      await logEducatorActivity({
        userId: currentUser?.uid ?? null,
        userEmail: currentUser?.email ?? null,
        userName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Utilisateur',
        ...entry,
      });
      await loadRecentActivity();
    } catch (err) {
      console.warn('Journalisation activité éducatrice impossible:', err);
    }
  }, [currentUser, loadRecentActivity]);

  const [sortBy, setSortBy] = useState('name'); // name, date, status, amount
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  const helpTopics = useMemo(() => ([
    {
      id: 'payment',
      title: 'Enregistrer un paiement',
      icon: '💳',
      steps: [
        'Choisissez un étudiant dans la liste et cliquez sur "Enregistrer un paiement".',
        'Confirmez la p?riode ? r?gler puis validez : le paiement est enregistr?.',
        'Le statut est mis ? jour et l\'historique est enregistr?.',
      ],
    },
    {
      id: 'import',
      title: 'Importer des étudiants',
      icon: '📥',
      steps: [
        'Préparez un fichier CSV avec les colonnes : nom, contact, ligne, etc.',
        'Cliquez sur "Import CSV" en bas à droite et sélectionnez le fichier.',
        'Le journal d\'activités indique combien d\'étudiants ont été ajoutés.',
      ],
    },
    {
      id: 'export',
      title: 'Exporter les données',
      icon: '📤',
      steps: [
        'Cliquez sur "Export CSV" pour télécharger tous les étudiants.',
        'Le fichier contient toutes les informations des étudiants.',
        'Vous pouvez l\'utiliser pour créer des sauvegardes ou des rapports.',
      ],
    },
    {
      id: 'reset',
      title: 'Réinitialiser les filtres',
      icon: '🔄',
      steps: [
        'Le bouton "Réinitialiser" remet la recherche et les tris à zéro.',
        'Tous les étudiants réapparaissent et le tri revient sur le nom (ordre A→Z).',
      ],
    },
    {
      id: 'educators',
      title: 'Suivi des éducatrices',
      icon: '👥',
      steps: [
        'Toutes les actions sont enregistrées avec l\'email de l\'éducatrice.',
        'L\'historique des actions montre qui a fait quoi et à quel moment.',
        'Les données sont synchronisées entre toutes les éducatrices connectées.',
      ],
    },
    {
      id: 'sync',
      title: 'Synchronisation multi-appareils',
      icon: '🔄',
      steps: [
        '✨ Toutes vos données sont synchronisées en temps réel via Firestore.',
        'Les modifications effectuées sur un appareil (PC, téléphone) sont immédiatement visibles sur tous les autres appareils.',
        'Plus besoin de rafraîchir manuellement - la synchronisation est automatique et continue.',
        'Toutes les données critiques (étudiants, paiements, contrôleurs, etc.) sont stockées dans le cloud et sécurisées.',
      ],
    },
  ]), []);

  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    const searchValue = (filters.search || '').trim().toLowerCase();
    let filtered = students.filter(student => {
      if (!student) return false;
      // Recherche améliorée : nom, contact, parent, classe, ligne
      const matchSearch = !searchValue
        || (student.name || '').toLowerCase().includes(searchValue)
        || (student.contact || '').toLowerCase().includes(searchValue)
        || (student.guardian || '').toLowerCase().includes(searchValue)
        || (student.classGroup || '').toLowerCase().includes(searchValue)
        || (student.niveau || student.promo || '').toLowerCase().includes(searchValue)
        || (student.busLine || '').toLowerCase().includes(searchValue);
      const matchStatus = filters.status === 'all' || student.paymentStatus === filters.status;
      const matchLine = filters.line === 'all' || student.busLine === filters.line;
      const matchPromo = filters.promo === 'all' || (student.niveau || student.promo || '').toLowerCase() === filters.promo.toLowerCase();
      const matchClass = filters.classGroup === 'all' || (student.classGroup || student.classe || '').toLowerCase() === filters.classGroup.toLowerCase();
      return matchSearch && matchStatus && matchLine && matchPromo && matchClass;
    });
    
    // Tri personnalisable
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'date':
          aVal = new Date(a.audit?.createdAt || 0).getTime();
          bVal = new Date(b.audit?.createdAt || 0).getTime();
          break;
        case 'status':
          aVal = a.paymentStatus || '';
          bVal = b.paymentStatus || '';
          break;
        case 'amount':
          aVal = Number(a.monthlyFee || 0);
          bVal = Number(b.monthlyFee || 0);
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [students, filters, sortBy, sortOrder]);

  const stats = useMemo(() => {
    try {
      return computeStats(Array.isArray(students) ? students : []);
    } catch (err) {
      console.error('Erreur computeStats:', err);
      return { total: 0, byStatus: {}, estimatedRevenue: 0, lines: 0 };
    }
  }, [students]);

  const handleSaveSettings = async ({ defaultMonthlyFee: nextDefaultFee, alertThreshold: nextAlertThreshold, vacationMessage: nextVacationMessage, pausedMonths: nextPausedMonths }) => {
    const previousPaused = Array.isArray(pausedMonths) ? [...pausedMonths] : [];
    const cleanDefaultFee = typeof nextDefaultFee === 'number' ? nextDefaultFee : defaultMonthlyFee;
    const cleanAlert = typeof nextAlertThreshold === 'number' ? nextAlertThreshold : alertThreshold;
    const cleanVacation = typeof nextVacationMessage === 'string' ? nextVacationMessage : vacationMessage;
    const cleanPaused = Array.isArray(nextPausedMonths) ? Array.from(new Set(nextPausedMonths)) : [];
    const prevPausedSet = new Set(previousPaused);
    const nextPausedSet = new Set(cleanPaused);
    const addedPaused = cleanPaused.filter(month => !prevPausedSet.has(month));
    const removedPaused = previousPaused.filter(month => !nextPausedSet.has(month));

    try {
      await saveGlobalSettings({
        defaultMonthlyFee: cleanDefaultFee,
        alertThreshold: cleanAlert,
        vacationMessage: cleanVacation,
        pausedMonths: cleanPaused,
      });
      setDefaultMonthlyFee(cleanDefaultFee);
      setAlertThreshold(cleanAlert);
      setVacationMessage(cleanVacation);
      setPausedMonths(cleanPaused);
      setMessageStatus(addedPaused.length || removedPaused.length
        ? 'Param?tres enregistr?s. Mois en pause mis ? jour.'
        : 'Param?tres enregistr?s.'
      );
      await educatorLog({
        action: 'settings:update',
        subjectType: 'settings',
        description: 'Mise ? jour des param?tres',
        metadata: {
          addedPausedMonths: addedPaused,
          removedPausedMonths: removedPaused,
        },
      });
    } catch (err) {
      setMessageStatus(`Erreur lors de l'enregistrement des param?tres : ${err.message}`);
      throw err;
    }
  };

  const handleAddStudent = async payload => {
    try {
      const result = await addStudent(payload, {
        userId: currentUser?.uid ?? null,
        userEmail: currentUser?.email ?? null,
      });
      const createdStudent = result?.localOnly ? result.student : result;
      setMessageStatus('Étudiant enregistré. Synchronisation en cours...');
      await educatorLog({
        action: 'student:create',
        subjectId: createdStudent?.id || null,
        subjectType: 'student',
        description: `Création de l'étudiant ${payload.name || createdStudent?.name || 'sans nom'}`,
        metadata: {
          contact: payload.contact || createdStudent?.contact || null,
          busLine: payload.busLine || createdStudent?.busLine || null,
        },
      });
      
      // Attendre que l'étudiant soit créé et le QR généré
      setTimeout(async () => {
        try {
          // Trouver l'étudiant créé
          const newStudent = students.find(s => s.contact === payload.contact && s.name === payload.name) || 
                            students[students.length - 1];
          
          if (newStudent && newStudent.contact && newStudent.qrCode?.token) {
            // Envoyer automatiquement le QR code via WhatsApp
            await handleSendWhatsApp(newStudent);
          } else if (newStudent && newStudent.contact) {
            // Si pas de QR, générer d'abord
            const resultRefresh = await refreshPass(newStudent, { force: true });
            await new Promise(resolve => setTimeout(resolve, 500));
            const updatedStudent = { ...newStudent, qrCode: { ...newStudent.qrCode, token: resultRefresh.token } };
            await handleSendWhatsApp(updatedStudent);
          }
        } catch (err) {
          console.warn('Envoi automatique WhatsApp après création échoué', err);
        }
      }, 2000);
    } catch (err) {
      setMessageStatus(`Étudiant enregistré localement : ${err.message}`);
    }
  };

  const handleDelete = async student => {
    if (!window.confirm(`Supprimer ${student.name} ?`)) return;
    try {
      await deleteStudent(student.id, {
        userId: currentUser?.uid ?? null,
        userEmail: currentUser?.email ?? null,
      });
      setMessageStatus('Étudiant supprimé.');
      await educatorLog({
        action: 'student:delete',
        subjectId: student.id,
        subjectType: 'student',
        description: `Suppression de l'étudiant ${student.name}`,
        metadata: {
          busLine: student.busLine || null,
        },
      });
    } catch (err) {
      setMessageStatus(`Suppression locale effectuée. Erreur Firestore : ${err.message}`);
    }
  };

  const handleTogglePayment = student => {
    setStatusTarget(student);
  };
  
  const handleSubmitStatus = async ({ studentId, paymentStatus }) => {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student) throw new Error('Étudiant introuvable');
      
      await updateStudent(studentId, { paymentStatus }, {
        userId: currentUser?.uid ?? null,
        userEmail: currentUser?.email ?? null,
      });
      setMessageStatus('Statut de paiement mis à jour.');
      setStatusTarget(null);
      await educatorLog({
        action: 'student:status-update',
        subjectId: studentId,
        subjectType: 'student',
        description: `Statut basculé en ${paymentStatus}`,
        metadata: {
          previousStatus: student.paymentStatus,
        },
      });
    } catch (err) {
      setMessageStatus(`Échec de synchronisation statut : ${err.message}`);
      throw err;
    }
  };

  const handleRegisterPayment = student => {
    setInitialPaymentDate(null);
    setInitialMonths(null);
    setPaymentMode('paiement');
    setPaymentTarget(student);
  };
  const handleReSubscribe = (student) => {
    setResubscriptionStudent(student);
    setShowResubscriptionModal(true);
    return;
    // Ancien code (désactivé, maintenant géré par ResubscriptionModal)
    try {
      const ledger = Array.isArray(student.monthsLedger) ? student.monthsLedger : [];
      const last = ledger[ledger.length - 1];
      let nextDate = new Date();
      if (last) {
        const [y, m] = last.split('-').map(Number);
        nextDate = new Date(y, m, 1); // 1er du mois suivant
      } else {
        // Si aucun mois, démarrer au 1er du mois courant
        const now = new Date();
        nextDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      setInitialPaymentDate(nextDate.toISOString());
    } catch {
      setInitialPaymentDate(null);
    }
    setInitialMonths(null);
    setPaymentMode('reabonnement');
    setPaymentTarget(student);
  };

  const handleSubmitPayment = async ({ studentId, montantTotal, nombreMois, dateDebut, description = '' }) => {
    try {
      // Utiliser la nouvelle fonction recordPaymentV2
      const paymentResult = await recordPaymentV2(
        {
          studentId,
          montantTotal,
          nombreMois,
          dateDebut,
          description,
        },
        {
          userId: currentUser?.uid ?? null,
          userEmail: currentUser?.email ?? null,
          userName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Utilisateur',
        },
      );
      
      // Récupérer l'étudiant mis à jour
      const refreshedStudent = students.find(s => s.id === studentId);
      
      setMessageStatus(`Paiement de ${nombreMois} mois (${montantTotal.toLocaleString('fr-FR')} FCFA) enregistré avec succès.`);
      await educatorLog({
        action: 'payment:record',
        subjectId: studentId,
        subjectType: 'student',
        description: `Paiement de ${nombreMois} mois (${montantTotal.toLocaleString('fr-FR')} FCFA) enregistré pour ${refreshedStudent?.name || 'inconnu'}`,
        metadata: {
          nombreMois,
          montantTotal,
          montantMensuel: Math.round(montantTotal / nombreMois * 100) / 100,
          dateDebut,
        },
      });
    } catch (err) {
      setMessageStatus(`Échec enregistrement paiement : ${err.message}`);
      throw err; // Re-throw pour que PaymentModal puisse gérer l'erreur
    }
  };

  const handleSendWhatsApp = async student => {
    try {
      setMessageStatus('Préparation du QR code pour WhatsApp...');
      
      // Récupérer ou générer le QR code
      let qrToken = student.qrCode?.token;
      if (!qrToken) {
        try {
          const result = await refreshPass(student, { force: true });
          qrToken = result.token;
        } catch (err) {
          console.warn('Impossible de générer le QR code:', err);
          setMessageStatus('Erreur : Impossible de générer le QR code.');
          return;
        }
      }
      
      const recipient = student.contact || '+225000000000';
      const line = lineOptions.find(item => item.id === student.busLine)?.name || 'N/A';
      const expiresAt = student.subscription?.expiresAt
        ? new Date(student.subscription.expiresAt).toLocaleDateString('fr-FR')
        : 'date inconnue';
      
      // Générer un QR code haute résolution pour WhatsApp
      setMessageStatus('Génération du QR code haute résolution...');
      const qrImage = await generateHighResQR(qrToken, 1024);
      
      // Créer un message avec instructions et informations de sécurité (personnalisé avec le nom de l'étudiant)
      const message = `Bonjour ${student.name},\n\n📱 *Votre code QR de transport*\n\n👤 Étudiant : ${student.name}\n🚌 Ligne : ${line}\n📅 Expiration : ${expiresAt}\n💰 Statut : ${statusLabel(student.paymentStatus)}\n\n*Instructions :*\n1. Le QR code a été téléchargé automatiquement sur votre appareil\n2. Ajoutez-le à ce message WhatsApp depuis vos téléchargements\n3. Présentez ce QR code au chauffeur lors de la montée dans le bus\n\n*Important - Sécurité :*\n• Ce QR code reste valide même si votre statut change\n• Un scan recent declenche une alerte (validation manuelle possible)\n• Ne partagez pas votre QR code avec d'autres étudiants\n• Si vous scannez trop tôt, vous verrez "Déjà scanné récemment"\n\n*EMSP - Ecole Multinationale Supérieure des Postes d'Abidjan*`;
      
      // Envoyer via WhatsApp avec l'image
      openWhatsAppWithImage(recipient, message, qrImage);
      setMessageStatus('WhatsApp ouvert. Le QR code a été téléchargé - ajoutez-le au message.');
    } catch (err) {
      console.error('WhatsApp send failed', err);
      setMessageStatus('Erreur lors de l\'ouverture de WhatsApp.');
    }
  };
  
  const getQRCodeImage = async (containerId) => {
    try {
      const container = document.getElementById(containerId);
      if (!container) return null;
      
      const canvas = container.querySelector('canvas');
      if (!canvas) return null;
      
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('Impossible de récupérer l\'image QR:', err);
      return null;
    }
  };

  const handleExportAll = () => {
    const hasFilters = Boolean(filters.search) || filters.status !== 'all' || filters.line !== 'all' || filters.promo !== 'all' || filters.classGroup !== 'all';
    const exportList = hasFilters ? filteredStudents : students;
    if (!exportList.length) {
      setMessageStatus(hasFilters ? 'Aucun etudiant dans ce filtre.' : 'Aucun etudiant a exporter.');
      return;
    }
    const filename = hasFilters ? 'bus-students-filtre.csv' : 'bus-students.csv';
    exportSubscribersCSV(exportList, filename);
    setMessageStatus(hasFilters ? `Export CSV genere (${exportList.length} etudiants filtres).` : 'Export CSV genere.');
    educatorLog({
      action: 'student:export',
      subjectType: 'bulk',
      description: `Export de ${exportList.length} etudiants${hasFilters ? ' (filtres)' : ''}`,
      metadata: {
        total: exportList.length,
        filtered: hasFilters,
      },
    });
  };

  const handleAnnualArchive = async () => {
    if (!isAdmin) {
      setMessageStatus('Action reservee aux administrateurs.');
      return;
    }

    if (!students.length) {
      setMessageStatus('Aucun etudiant a archiver.');
      return;
    }

    const confirmed = window.confirm(
      'Archivage annuel : un backup complet sera exporte puis les etudiants et paiements seront supprimes pour demarrer une nouvelle annee.\n\nSouhaitez-vous continuer ?'
    );
    if (!confirmed) return;

    const confirmText = 'ARCHIVER';
    const userInput = window.prompt('Tapez ' + confirmText + ' pour confirmer l\'archivage annuel :');
    if (userInput !== confirmText) {
      setMessageStatus('Archivage annuel annule.');
      return;
    }

    try {
      setMessageStatus('Export du backup annuel...');
      await exportAllJSON();
      const backup = await createBackup();
      await exportBackupToCSV(backup);
      setMessageStatus('Backup exporte. Suppression des donnees en cours...');
      await clearStudentsAndPayments();
      setMessageStatus('Archivage annuel termine. Base remise a zero.');
    } catch (err) {
      setMessageStatus('Erreur archivage annuel : ' + (err.message || err));
    }
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validation du type de fichier
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setMessageStatus('Erreur : Le fichier doit être au format CSV.');
      event.target.value = '';
      return;
    }
    
    try {
      setImportProgress({ status: 'parsing', message: 'Analyse du fichier CSV...' });
      const importedStudents = await importStudentsFromCSV(file, setImportProgress);
      
      if (!importedStudents || !Array.isArray(importedStudents) || importedStudents.length === 0) {
        setMessageStatus('Aucun étudiant trouvé dans le fichier CSV.');
        setImportProgress(null);
        event.target.value = '';
        return;
      }
      
      setImportProgress({ status: 'importing', message: `Import de ${importedStudents.length} étudiant(s)...` });
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const student of importedStudents) {
        // Validation de base avant l'import
        if (!student || !student.name || !student.contact) {
          errorCount++;
          errors.push(`Étudiant invalide : ${student?.name || 'Sans nom'}`);
          continue;
        }
        
        try {
          await addStudent(student, {
            userId: currentUser?.uid ?? null,
            userEmail: currentUser?.email ?? null,
          });
          successCount++;
        } catch (err) {
          console.warn(`Erreur import étudiant ${student.name}:`, err);
          errorCount++;
          errors.push(`${student.name}: ${err.message || 'Erreur inconnue'}`);
        }
        // Petit délai pour éviter de surcharger
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setImportProgress(null);
      const message = `${successCount} étudiant(s) importé(s) avec succès.${errorCount > 0 ? ` ${errorCount} erreur(s).` : ''}`;
      setMessageStatus(message);
      
      if (errors.length > 0 && errors.length <= 5) {
        console.warn('Erreurs d\'import:', errors);
      }
      
      await educatorLog({
        action: 'student:import',
        subjectType: 'bulk',
        description: `Import CSV terminé (${successCount} succès, ${errorCount} erreurs)`,
        metadata: {
          success: successCount,
          errors: errorCount,
          filename: file.name,
          total: importedStudents.length,
        },
      });
      
      // Réinitialiser l'input file
      event.target.value = '';
    } catch (err) {
      console.error('Erreur import CSV:', err);
      setMessageStatus(`Erreur lors de l'import : ${err.message || 'Erreur inconnue'}`);
      setImportProgress(null);
      event.target.value = '';
    }
  };

  const handleExportPass = student => {
    exportSubscribersCSV([student], `pass-${student.name.replace(/\s+/g, '-').toLowerCase()}.csv`);
    setMessageStatus('Pass exporté au format CSV.');
  };

  const handleRefreshPass = async student => {
    setProcessingPassId(student.id);
    try {
      const result = await refreshPass(student, { force: true });
      setMessageStatus(`QR régénéré. Expiration ${new Date(result.expiresAt).toLocaleDateString('fr-FR')}`);
      // Envoyer automatiquement le QR code via WhatsApp après régénération
      if (student.contact) {
        try {
          // Attendre que le QR soit synchronisé
          await new Promise(resolve => setTimeout(resolve, 500));
          const updatedStudent = { ...student, qrCode: { ...student.qrCode, token: result.token } };
          await handleSendWhatsApp(updatedStudent);
        } catch (err) {
          console.warn('Envoi WhatsApp automatique échoué', err);
        }
      }
    } catch (err) {
      setMessageStatus(`Impossible de régénérer le QR : ${err.message}`);
    } finally {
      setProcessingPassId(null);
    }
  };

  // Fonction utilitaire pour générer un QR code haute résolution
  const generateHighResQR = async (qrValue, size = 1024) => {
    const { QRCodeCanvas } = await import('qrcode.react');
    const { createRoot } = await import('react-dom/client');
    
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.width = `${size}px`;
    tempContainer.style.height = `${size}px`;
    document.body.appendChild(tempContainer);
    
    const root = createRoot(tempContainer);
    
    return new Promise((resolve, reject) => {
      root.render(
        React.createElement(QRCodeCanvas, {
          value: qrValue,
          size: size,
          level: 'H', // Niveau de correction d'erreur élevé
          includeMargin: true,
        })
      );
      
      // Attendre que le canvas soit rendu
      setTimeout(() => {
        const qrCanvas = tempContainer.querySelector('canvas');
        if (qrCanvas) {
          const dataUrl = qrCanvas.toDataURL('image/png', 1.0);
          root.unmount();
          document.body.removeChild(tempContainer);
          resolve(dataUrl);
        } else {
          root.unmount();
          document.body.removeChild(tempContainer);
          reject(new Error('Canvas QR code non généré'));
        }
      }, 500);
    });
  };

  const handleDownloadQR = async (student, containerId) => {
    try {
      // Récupérer la valeur du QR code
      const qrValue = student.qrCode?.token;
      if (!qrValue) {
        setMessageStatus('QR code non disponible. Veuillez générer un QR code d\'abord.');
        return;
      }
      
      setMessageStatus('Génération du QR code haute résolution...');
      
      // Générer un QR code haute résolution (1024x1024)
      const dataUrl = await generateHighResQR(qrValue, 1024);
      
      // Télécharger l'image
      const link = document.createElement('a');
      link.download = `QR-${student.name.replace(/\s+/g, '-')}-${student.id}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessageStatus('QR code haute résolution téléchargé avec succès.');
    } catch (err) {
      console.error('Erreur téléchargement QR', err);
      setMessageStatus('Erreur lors du téléchargement du QR code.');
    }
  };

  const handleSendWhatsAppWithQR = async (student, qrToken = null) => {
    try {
      setMessageStatus('Ouverture de WhatsApp avec le QR code...');
      const recipient = student.contact || '+225000000000';
      const line = lineOptions.find(item => item.id === student.busLine)?.name || 'N/A';
      const expiresAt = student.subscription?.expiresAt
        ? new Date(student.subscription.expiresAt).toLocaleDateString('fr-FR')
        : 'date inconnue';
      
      // Construire le message avec le QR code
      let message = `🎓 *EMSP - Reçu de Paiement*\n\n`;
      message += `Bonjour ${student.guardian || student.name},\n\n`;
      message += `✅ *Paiement confirmé*\n`;
      message += `👤 Étudiant : ${student.name}\n`;
      message += `🚌 Ligne : ${line}\n`;
      message += `📅 Expiration : ${expiresAt}\n`;
      message += `💰 Statut : ${statusLabel(student.paymentStatus)}\n\n`;
      
      if (qrToken) {
        message += `📱 Votre code QR d'accès :\n\`\`\`${qrToken}\`\`\`\n\n`;
        message += `*Instructions :*\n`;
        message += `Présentez ce code QR au chauffeur lors de la montée dans le bus.\n\n`;
      }
      
      message += `*École Multinationale Supérieure des Postes d'Abidjan*\n`;
      message += `Merci de votre confiance ! 🎉`;
      
      openWhatsAppWithMessage(recipient, message);
      setMessageStatus('WhatsApp ouvert avec le message et le QR code pré-remplis.');
    } catch (err) {
      console.error('WhatsApp send failed', err);
      setMessageStatus('Erreur lors de l\'ouverture de WhatsApp.');
    }
  };

  const handleRevokePass = async student => {
    if (!window.confirm('Révoquer ce QR code ?')) return;
    try {
      await revokePass(student.id);
      setMessageStatus('QR révoqué.');
      await educatorLog({
        action: 'qr:revoke',
        subjectId: student.id,
        subjectType: 'student',
        description: `QR code révoqué pour ${student.name}`,
      });
    } catch (err) {
      setMessageStatus(`Échec de révocation : ${err.message}`);
    }
  };

  const handleSendReminders = async (studentsToSend, messageTemplate) => {
    try {
      setMessageStatus(`Envoi de ${studentsToSend.length} rappel(s)...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const student of studentsToSend) {
        try {
          const recipient = student.contact || '+225000000000';
          
          // Personnaliser le message avec les informations de l'étudiant
          const personalizedMessage = personalizeReminderMessage(messageTemplate, student);
          
          openWhatsAppWithMessage(recipient, personalizedMessage);
          successCount++;
          
          // Attendre un peu entre chaque envoi pour éviter de surcharger
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.warn(`Erreur envoi rappel à ${student.name}:`, err);
          errorCount++;
        }
      }
      
      setMessageStatus(`${successCount} rappel(s) envoyé(s) avec succès.${errorCount > 0 ? ` ${errorCount} erreur(s).` : ''}`);
      await educatorLog({
        action: 'reminder:send',
        subjectType: 'bulk',
        description: `Rappels WhatsApp envoyés (${successCount} succès, ${errorCount} erreurs)`,
        metadata: {
          success: successCount,
          errors: errorCount,
        },
      });
    } catch (err) {
      setMessageStatus(`Erreur lors de l'envoi des rappels : ${err.message}`);
      throw err;
    }
  };

  // Fonction pour personnaliser le message de rappel
  const personalizeReminderMessage = (template, student) => {
    const line = lineOptions.find(item => item.id === student.busLine)?.name || student.busLine || 'N/A';
    const expiresAt = student.subscription?.expiresAt
      ? new Date(student.subscription.expiresAt).toLocaleDateString('fr-FR')
      : 'date inconnue';
    const statusLabel = getStatusLabel(student.paymentStatus);
    
    return template
      .replace(/\{nom\}/g, student.name)
      .replace(/\{etudiant\}/g, student.name)
      .replace(/\{ligne\}/g, line)
      .replace(/\{expiration\}/g, expiresAt)
      .replace(/\{statut\}/g, statusLabel)
      .replace(/\{niveau\}/g, student.niveau || 'N/A')
      .replace(/\{contact\}/g, student.contact || 'N/A')
      .replace(/\{parent\}/g, student.guardian || 'N/A');
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case PAYMENT_STATUS.UP_TO_DATE:
        return 'À jour';
      case PAYMENT_STATUS.LATE:
        return 'En retard';
      case PAYMENT_STATUS.OUT_OF_SERVICE:
        return 'Suspendu';
      default:
        return 'Nouveau';
    }
  };

  const formatActivityTitle = activity => {
    if (!activity) return 'Action inconnue';
    if (activity.description) return activity.description;
    switch (activity.action) {
      case 'student:create':
        return 'Nouvel étudiant enregistré';
      case 'student:delete':
        return 'Suppression d\'un étudiant';
      case 'student:status-update':
        return 'Changement de statut';
      case 'payment:record':
        return 'Paiement enregistré';
      case 'student:import':
        return 'Import CSV';
      case 'student:export':
        return 'Export CSV';
      case 'settings:update-paused-months':
        return 'Mise à jour des mois en pause';
      case 'reminder:send':
        return 'Envoi de rappels';
      case 'qr:revoke':
        return 'QR code révoqué';
      default:
        return activity.action || 'Action';
    }
  };

  const formatActivityTimestamp = timestamp => {
    if (!timestamp) return 'Date inconnue';
    try {
      return new Date(timestamp).toLocaleString('fr-FR');
    } catch {
      return timestamp;
    }
  };

  const getTimeAgo = timestamp => {
    if (!timestamp) return null;
    try {
      const now = new Date();
      const then = new Date(timestamp);
      const diffMs = now - then;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'à l\'instant';
      if (diffMins < 60) return `il y a ${diffMins} min`;
      if (diffHours < 24) return `il y a ${diffHours}h`;
      if (diffDays < 7) return `il y a ${diffDays}j`;
      return null; // Ne pas afficher pour les dates plus anciennes
    } catch {
      return null;
    }
  };

  const activeHelpTopic = useMemo(() => {
    return helpTopics.find(topic => topic.id === activeHelp) || helpTopics[0];
  }, [helpTopics, activeHelp]);

  return (
    <main className="app-shell page-transition" style={{ maxWidth: '1160px', margin: '0 auto' }}>
      <header className="card fade-in" style={{ padding: '1.75rem 2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="badge badge--success" style={{ padding: '0.6rem', borderRadius: '14px' }}>
              <Bus size={28} />
            </div>
            <div>
              <h1 className="section-title" style={{ margin: 0 }}>EMSP - Car Management</h1>
              <p className="subtitle">Ecole Multinationale Supérieure des Postes d'Abidjan</p>
              <p className="subtitle" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Gestion des étudiants, paiements et QR passes sécurisés.</p>
            </div>
          </div>
          <div className="chips">
            <span className={`chip ${synced ? 'chip--primary' : ''}`}>
              {synced ? <ShieldCheck size={16} /> : <ShieldX size={16} />} Synchronisation {synced ? 'Firestore active' : 'hors ligne'}
            </span>
            <span className={`chip ${pausePlatform ? 'chip--danger' : ''}`}>
              {pausePlatform ? 'Pause vacances: activée' : 'Pause vacances: désactivée'}
            </span>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="chip" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isAdmin ? <Crown size={14} style={{ color: '#f59e0b' }} /> : <Users size={14} />}
                  <span style={{ fontWeight: 500 }}>{userName}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({userRole})</span>
                </span>
                {isAdmin && (
                  <button
                    className="button button--subtle"
                    type="button"
                    onClick={() => setShowUserManager(true)}
                    style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <UserCog size={16} /> Gérer utilisateurs
                  </button>
                )}
                <button
                  className="button button--subtle"
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Key size={16} /> Modifier mot de passe
                </button>
                <button
                  className="button button--subtle"
                  type="button"
                  onClick={async () => {
                    try {
                      const auth = useAuth();
                      if (auth.logout) {
                        await auth.logout();
                      }
                    } catch (err) {
                      console.warn('Erreur déconnexion:', err);
                    }
                  }}
                  style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <LogOut size={16} /> Déconnexion
                </button>
              </div>
            ) : null}
            {loading ? <span className="chip">Traitement en cours...</span> : null}
          </div>
        </div>
        
        {/* Barre d'outils principale - Toujours visible */}
        <div className="card fade-in scroll-reveal" style={{ padding: '1rem 1.5rem', marginTop: '1rem', marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1rem', color: '#475569' }}>Outils de gestion</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="button button--subtle"
              type="button"
              onClick={async () => {
                if (!window.confirm('Réinitialiser les scans du jour ? Cette action supprime les logs de scans effectués aujourd'hui pour permettre un nouveau contrôle immédiat.')) return;
                try {
                  const deleted = await resetTodayScanLogs();
                  setMessageStatus(`Scans du jour réinitialisés. ${deleted} entrée(s) supprimée(s).`);
                } catch (err) {
                  setMessageStatus(`Échec de la réinitialisation des scans : ${err.message}`);
                }
              }}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <RefreshCcw size={16} /> Réinit. scans du jour
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowLineManager(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Settings size={16} /> Gérer les lignes
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={async () => {
                try {
                  const next = !pausePlatform;
                  await setPausePlatform(next);
                  setPause(next);
                  setMessageStatus(next ? 'Pause vacances activée: les contrôles sont bloqués.' : 'Pause vacances désactivée.');
                } catch (err) {
                  setMessageStatus(`Impossible de changer l'état de pause: ${err.message}`);
                }
              }}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              {pausePlatform ? 'Désactiver la pause' : 'Activer la pause'}
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowControllerManager(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <UserCheck size={16} /> Gérer les contrôleurs
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowMonthlyReports(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <BarChart2 size={16} /> Bilans mensuels
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowMonthlyBalance(true)}
              style={{ padding: '0.5rem 0.75rem', background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)', border: '1px solid #facc15', fontWeight: 600 }}
            >
              <BarChart2 size={16} /> Bilan Financier
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={async () => {
                try {
                  setMessageStatus('Création du backup...');
                  const backup = await createBackup();
                  setMessageStatus(`Backup créé avec succès. ${backup.count} étudiant(s) sauvegardé(s).`);
                } catch (err) {
                  setMessageStatus(`Erreur création backup : ${err.message}`);
                }
              }}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Download size={16} /> Créer backup
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={handleAnnualArchive}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Calendar size={16} /> Archiver annee
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={async () => {
                try {
                  setMessageStatus('Envoi des notifications automatiques...');
                  const result = await checkAndSendAutomaticNotifications(students);
                  setMessageStatus(`Notifications envoyées : ${result.sent} réussie(s), ${result.errors} erreur(s).`);
                } catch (err) {
                  setMessageStatus(`Erreur envoi notifications : ${err.message}`);
                }
              }}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Bell size={16} /> Envoyer notifications
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowSettings(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Settings size={16} /> Paramètres
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowHelp(prev => !prev)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <HelpCircle size={16} /> Centre d'aide
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowClassPromoManager(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <GraduationCap size={16} /> Classes & Promos
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowOutOfServiceMonths(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Calendar size={16} /> Mois hors service
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowRemindersConfig(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Bell size={16} /> Config. rappels
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowReminderSender(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Bell size={16} /> Envoyer rappels
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowScanHistory(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <BarChart2 size={16} /> Historique scans
            </button>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setShowAccounting(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <DollarSign size={16} /> Comptabilité
            </button>
          </div>
        </div>
        {messageStatus ? (
          <div className="card" style={{ padding: '1rem', marginTop: '1rem', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <p className="subtitle" style={{ margin: 0, color: '#16a34a' }}>{messageStatus}</p>
          </div>
        ) : null}
        {importProgress ? (
          <div className="card" style={{ padding: '1rem', marginTop: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <p className="subtitle" style={{ margin: 0, color: '#2563eb' }}>
              {importProgress.status === 'parsing' && '📄 '}
              {importProgress.status === 'importing' && '📥 '}
              {importProgress.message}
              {importProgress.count && ` (${importProgress.count} étudiant(s))`}
            </p>
          </div>
        ) : null}
        {error ? <p className="subtitle" style={{ marginTop: '0.5rem', color: '#b91c1c' }}>{error.message}</p> : null}
      </header>

      <div className="fade-in scroll-reveal">
        <SummaryCards stats={stats} students={students} />
      </div>

      {/* Alertes : étudiants expirant bientôt */}
      {useMemo(() => {
        const now = new Date();
        const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        const expiringStudents = students.filter(student => {
          const expirationDate = student.subscriptionExpiresAt ? new Date(student.subscriptionExpiresAt) : (student.subscription?.expiresAt ? new Date(student.subscription.expiresAt) : null);
          if (!expirationDate) return false;
          return expirationDate > now && expirationDate <= in15Days;
        });
        if (expiringStudents.length === 0) return null;
        return (
          <div className="card fade-in scroll-reveal" style={{ padding: '1rem', marginTop: '1.5rem', background: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', border: '2px solid #f97316' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={20} style={{ color: '#f97316' }} />
              <h3 className="section-title" style={{ margin: 0, fontSize: '1rem', color: '#c2410c' }}>
                ⚠️ Alertes : {expiringStudents.length} étudiant{expiringStudents.length > 1 ? 's' : ''} dont l'abonnement expire bientôt (≤15 jours)
              </h3>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {expiringStudents.slice(0, 5).map(student => {
                const expirationDate = student.subscriptionExpiresAt ? new Date(student.subscriptionExpiresAt) : (student.subscription?.expiresAt ? new Date(student.subscription.expiresAt) : null);
                const daysLeft = expirationDate ? Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                return (
                  <div key={student.id} style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #facc15' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{student.name}</span>
                      <span style={{ fontSize: '0.85rem', color: '#c2410c', fontWeight: 600 }}>
                        Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''} ({expirationDate ? expirationDate.toLocaleDateString('fr-FR') : 'N/A'})
                      </span>
                    </div>
                  </div>
                );
              })}
              {expiringStudents.length > 5 && (
                <p className="subtitle" style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', textAlign: 'center' }}>
                  ... et {expiringStudents.length - 5} autre{expiringStudents.length - 5 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        );
      }, [students])}

      <AnalyticsDashboard students={students} />

      <section className="fade-in scroll-reveal" style={{ marginTop: '1.5rem' }}>
        <div className="card fade-in" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1rem' }}>Filtrer la liste</h2>
          <div className="toolbar">
            <div className="toolbar__group" style={{ flex: 1 }}>
              <input
                className="input-field"
                type="search"
                placeholder="Rechercher par nom, contact, parent, classe, promo, ligne..."
                value={filters.search}
                onChange={event => setFilters(prev => ({ ...prev, search: event.target.value }))}
              />
            </div>
            <div className="toolbar__group">
              <Filter size={16} />
              <select
                className="input-field"
                style={{ width: '160px' }}
                value={filters.status}
                onChange={event => setFilters(prev => ({ ...prev, status: event.target.value }))}
              >
                <option value="all">Tous les statuts</option>
                <option value={PAYMENT_STATUS.UP_TO_DATE}>À jour</option>
                <option value={PAYMENT_STATUS.LATE}>En retard</option>
                <option value={PAYMENT_STATUS.OUT_OF_SERVICE}>Suspendu</option>
              </select>
              <select
                className="input-field"
                style={{ width: '180px' }}
                value={filters.promo}
                onChange={event => setFilters(prev => ({ ...prev, promo: event.target.value }))}
              >
                <option value="all">Toutes les promos</option>
                {promoOptions.map(promo => (
                  <option key={promo} value={promo}>{promo}</option>
                ))}
              </select>
              <select
                className="input-field"
                style={{ width: '180px' }}
                value={filters.classGroup}
                onChange={event => setFilters(prev => ({ ...prev, classGroup: event.target.value }))}
              >
                <option value="all">Toutes les classes</option>
                {classOptions.map(classe => (
                  <option key={classe} value={classe}>{classe}</option>
                ))}
              </select>
              <select
                className="input-field"
                style={{ width: '200px' }}
                value={filters.line}
                onChange={event => setFilters(prev => ({ ...prev, line: event.target.value }))}
              >
                <option value="all">Toutes les lignes</option>
                {lineOptions.map(line => (
                  <option key={line.id} value={line.id}>{line.name}</option>
                ))}
              </select>
              <select
                className="input-field"
                style={{ width: '140px' }}
                value={sortBy}
                onChange={event => setSortBy(event.target.value)}
              >
                <option value="name">Trier par nom</option>
                <option value="date">Trier par date</option>
                <option value="status">Trier par statut</option>
                <option value="amount">Trier par montant</option>
              </select>
              <button
                className="button button--subtle"
                type="button"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                style={{ padding: '0.5rem' }}
                title={`Tri ${sortOrder === 'asc' ? 'croissant' : 'décroissant'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <StudentForm onSubmit={handleAddStudent} loading={loading} lines={lineOptions} plans={SUBSCRIPTION_PLANS} />

        <div className="divider" />

        <StudentList
          students={filteredStudents}
          lines={lineOptions}
          plans={SUBSCRIPTION_PLANS}
          onSendWhatsApp={handleSendWhatsApp}
          onReSubscribe={handleReSubscribe}
          onEdit={(student) => setEditingStudent(student)}
          onExportPass={handleExportPass}
          onDelete={handleDelete}
          onTogglePayment={handleTogglePayment}
          onRegisterPayment={handleRegisterPayment}
          onRefreshPass={handleRefreshPass}
          onRevokePass={handleRevokePass}
          onDownloadQR={handleDownloadQR}
          processingPassId={processingPassId}
        />
      </section>

      <div className="card" style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={18} /> Historique des actions
          </h2>
          <button
            className="button button--subtle"
            type="button"
            onClick={loadRecentActivity}
            disabled={activityLoading}
          >
            Actualiser
          </button>
        </div>
        {activityError ? (
          <p className="subtitle" style={{ color: '#b91c1c', marginBottom: '0.75rem' }}>{activityError}</p>
        ) : null}
        {activityLoading ? (
          <p className="subtitle" style={{ color: '#2563eb', marginBottom: '0.75rem' }}>Chargement des activités...</p>
        ) : null}
        {!activityLoading && activities.length === 0 ? (
          <p className="subtitle" style={{ margin: 0, color: '#64748b' }}>Aucune activité récente.</p>
        ) : null}
        {!activityLoading && activities.length > 0 ? (
          <ul className="list" style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {activities.map(activity => {
              const timestamp = formatActivityTimestamp(activity.timestamp);
              const timeAgo = activity.timestamp ? getTimeAgo(activity.timestamp) : null;
              return (
                <li key={activity.id} className="list__item" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.75rem', borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatActivityTitle(activity)}</div>
                  <div className="subtitle" style={{ fontSize: '0.8rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {activity.userName ? (
                      <span style={{ fontWeight: 500, color: '#3b82f6' }}>👤 {activity.userName}</span>
                    ) : activity.userEmail ? (
                      <span style={{ fontWeight: 500, color: '#3b82f6' }}>👤 {activity.userEmail}</span>
                    ) : null}
                    {timestamp ? (
                      <span style={{ color: '#64748b' }}>🕐 {timestamp}{timeAgo ? ` (${timeAgo})` : ''}</span>
                    ) : null}
                  </div>
                  {(activity.metadata?.monthsCount || typeof activity.metadata?.totalAmount === 'number' || activity.metadata?.total) ? (
                    <div className="chips" style={{ marginTop: '0.25rem' }}>
                      {activity.metadata?.monthsCount ? (
                        <span className="chip chip--primary" style={{ fontSize: '0.75rem' }}>{activity.metadata.monthsCount} mois</span>
                      ) : null}
                      {typeof activity.metadata?.totalAmount === 'number' ? (
                        <span className="chip" style={{ fontSize: '0.75rem' }}>{Number(activity.metadata.totalAmount).toLocaleString('fr-FR')} FCFA</span>
                      ) : null}
                      {activity.metadata?.total ? (
                        <span className="chip" style={{ fontSize: '0.75rem' }}>{activity.metadata.total} élément(s)</span>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {showHelp && activeHelpTopic ? (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 90,
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          <div className="card" style={{ 
            width: '340px', 
            padding: '1.25rem', 
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{activeHelpTopic.icon}</span>
                <h4 className="section-title" style={{ margin: 0, fontSize: '1rem' }}>Centre d'aide</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                style={{
                  background: 'rgba(100, 116, 139, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Fermer l'aide"
              >
                <X size={16} />
              </button>
            </div>
            <label className="subtitle" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
              Choisir un sujet
              <select
                className="input-field"
                value={activeHelp}
                onChange={event => setActiveHelp(event.target.value)}
                style={{ marginTop: '0.35rem', fontSize: '0.9rem' }}
              >
                {helpTopics.map(topic => (
                  <option key={topic.id} value={topic.id}>{topic.icon} {topic.title}</option>
                ))}
              </select>
            </label>
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.05)', 
              padding: '0.75rem', 
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.1)',
            }}>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#475569', display: 'grid', gap: '0.5rem' }}>
                {activeHelpTopic.steps.map((step, index) => {
                  return (
                    <li key={index} style={{ lineHeight: '1.5' }}>{step}</li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      ) : null}

      <div className="floating-bar">
        <button
          className="button button--subtle"
          type="button"
          onClick={() => {
            setFilters({ search: '', status: 'all', line: 'all', promo: 'all', classGroup: 'all' });
            setSortBy('name');
            setSortOrder('asc');
            setMessageStatus('Filtres et tri réinitialisés.');
            setTimeout(() => setMessageStatus(''), 3000);
          }}
        >
          <RefreshCcw size={16} /> Réinitialiser
        </button>
        <label className="button" style={{ cursor: 'pointer', margin: 0 }}>
          <Upload size={16} /> Import CSV
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportCSV}
          />
        </label>
        <button className="button" type="button" onClick={() => setShowReminderModal(true)}>
          <Bell size={16} /> Rappels
        </button>
        <button className="button" type="button" onClick={handleExportAll}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <PaymentModal
        open={Boolean(paymentTarget)}
        student={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSubmit={handleSubmitPayment}
        plans={SUBSCRIPTION_PLANS}
        defaultMonthlyFee={defaultMonthlyFee}
        initialPaidAt={initialPaymentDate}
        initialMonths={initialMonths}
        initialPlanId={null}
        mode={paymentMode}
        currentUser={currentUser}
      />

      <StatusModal
        open={Boolean(statusTarget)}
        student={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSubmit={handleSubmitStatus}
      />

      <ReminderModal
        open={showReminderModal}
        students={students}
        lines={lineOptions}
        onClose={() => setShowReminderModal(false)}
        onSend={handleSendReminders}
      />

      {showMonthlyReports && (
        <MonthlyReports
          open={showMonthlyReports}
          onClose={() => setShowMonthlyReports(false)}
          students={students}
          lines={lineOptions}
          onReSubscribe={(studentId) => {
            const s = students.find(st => st.id === studentId);
            if (s) handleReSubscribe(s);
            setShowMonthlyReports(false);
          }}
        />
      )}

      {showLineManager && (
        <LineManager
          lines={lineOptions}
          onSave={async (line) => {
            try {
              await saveLine(line);
              setMessageStatus('Ligne enregistrée avec succès.');
            } catch (err) {
              setMessageStatus(`Erreur lors de l'enregistrement : ${err.message}`);
            }
          }}
          onDelete={async (lineId) => {
            try {
              await deleteLine(lineId);
              setMessageStatus('Ligne supprimée avec succès.');
            } catch (err) {
              setMessageStatus(`Erreur lors de la suppression : ${err.message}`);
            }
          }}
          onClose={() => setShowLineManager(false)}
        />
      )}

      {showControllerManager && (
        <ControllerManager
          controllers={controllers}
          lines={lineOptions}
          onSave={async (controller) => {
            try {
              if (controller.id) {
                await updateController(controller.id, controller);
                setMessageStatus('Contrôleur mis à jour avec succès.');
              } else {
                await createController(controller);
                setMessageStatus('Contrôleur créé avec succès. Le mot de passe a été généré.');
              }
            } catch (err) {
              setMessageStatus(`Erreur lors de l'enregistrement : ${err.message}`);
            }
          }}
          onDelete={async (controllerId) => {
            try {
              await deleteController(controllerId);
              setMessageStatus('Contrôleur supprimé avec succès.');
            } catch (err) {
              setMessageStatus(`Erreur lors de la suppression : ${err.message}`);
            }
          }}
          onClose={() => setShowControllerManager(false)}
        />
      )}

      {showMonthlyBalance && (
        <MonthlyBalanceModal
          open={showMonthlyBalance}
          onClose={() => setShowMonthlyBalance(false)}
          students={students}
        />
      )}

      {showSettings && (
        <SettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          defaultMonthlyFee={defaultMonthlyFee}
          onChangeDefaultFee={setDefaultMonthlyFee}
          alertThreshold={alertThreshold}
          onChangeAlertThreshold={setAlertThreshold}
          vacationMessage={vacationMessage}
          onChangeVacationMessage={setVacationMessage}
          pausedMonths={pausedMonths}
          onChangePausedMonths={setPausedMonths}
        />
      )}

      {showUserManager && isAdmin && (
        <UserManagerModal
          users={users}
          currentUserId={currentUser?.uid}
          onClose={() => setShowUserManager(false)}
          onCreate={async (userData) => {
            try {
              // ✅ NOUVEAU : Confirmation si création admin
              if (userData.role === 'admin') {
                const confirmMessage = 
                  `⚠️ ATTENTION\n\n` +
                  `Vous allez créer un compte administrateur pour "${userData.name || userData.email}".\n\n` +
                  `Cette personne aura accès à TOUTES les fonctionnalités.\n\n` +
                  `Confirmer cette création ?`;
                
                if (!window.confirm(confirmMessage)) {
                  return;
                }
              }
              
              await createUser(userData, {
                userId: currentUser?.uid,
                userEmail: currentUser?.email,
                userName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Admin',
              });
              setMessageStatus(`Utilisateur ${userData.email} créé avec succès.`);
              await educatorLog({
                action: 'user:create',
                subjectType: 'user',
                description: `Création utilisateur: ${userData.email} (${userData.role})`,
                metadata: { email: userData.email, role: userData.role },
              });
            } catch (err) {
              setMessageStatus(`Erreur création utilisateur: ${err.message}`);
            }
          }}
          onUpdate={async (userId, updates) => {
            try {
              // ✅ NOUVEAU : Confirmation si promotion admin
              if (updates.role === 'admin') {
                const user = users.find(u => u.id === userId);
                const userName = user?.name || user?.email || 'cet utilisateur';
                
                const confirmMessage = 
                  `⚠️ ATTENTION\n\n` +
                  `Vous allez donner les droits administrateur à "${userName}".\n\n` +
                  `Cette personne aura accès à TOUTES les fonctionnalités, y compris :\n` +
                  `- Création/suppression d'utilisateurs\n` +
                  `- Réinitialisation de mots de passe\n` +
                  `- Gestion complète du système\n\n` +
                  `Confirmer cette promotion ?`;
                
                if (!window.confirm(confirmMessage)) {
                  return;
                }
              }
              
              await updateUser(userId, updates, {
                userId: currentUser?.uid,
                userEmail: currentUser?.email,
                userName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Admin',
              });
              setMessageStatus('Utilisateur mis à jour avec succès.');
              
              // Enregistrer dans l'historique
              await educatorLog({
                action: updates.role === 'admin' ? 'UPDATE_USER_ROLE' : 'user:update',
                subjectId: userId,
                subjectType: 'user',
                description: updates.role === 'admin' 
                  ? `Promotion éducateur → admin pour "${updates.name || userId}"`
                  : `Mise à jour utilisateur: ${updates.email || userId}`,
                metadata: {
                  ...updates,
                  ...(updates.role === 'admin' && {
                    oldRole: 'educator',
                    newRole: 'admin',
                    type: 'promotion',
                  }),
                },
              });
            } catch (err) {
              setMessageStatus(`Erreur mise à jour utilisateur: ${err.message}`);
            }
          }}
          onDelete={async (userId) => {
            try {
              const isSelfDeletion = userId === currentUser?.uid;
              
              // ✅ NOUVEAU : Si auto-suppression, utiliser la fonction authService avec confirmation renforcée
              if (isSelfDeletion) {
                // La confirmation renforcée sera gérée dans le composant UserManagerModal
                // Ici on appelle juste deleteUser avec les options
              }
              
              await deleteUser(userId, {
                userId: currentUser?.uid,
                userEmail: currentUser?.email,
                userName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Admin',
              });
              
              setMessageStatus('Utilisateur supprimé avec succès.');
              
              // Enregistrer dans l'historique (sauf si auto-suppression, déjà fait dans deleteUser)
              if (!isSelfDeletion) {
                await educatorLog({
                  action: 'user:delete',
                  subjectId: userId,
                  subjectType: 'user',
                  description: `Suppression utilisateur: ${userId}`,
                });
              }
              
              // ✅ NOUVEAU : Si auto-suppression, déconnexion et redirection
              if (isSelfDeletion) {
                const { logout } = await import('../services/authService');
                await logout();
                window.location.href = '/login';
                return;
              }
            } catch (err) {
              setMessageStatus(`Erreur suppression utilisateur: ${err.message}`);
            }
          }}
        />
      )}

      {showClassPromoManager && (
        <ClassPromoManager
          onClose={() => setShowClassPromoManager(false)}
        />
      )}

      {showResubscriptionModal && resubscriptionStudent && (
        <ResubscriptionModal
          student={resubscriptionStudent}
          onClose={() => {
            setShowResubscriptionModal(false);
            setResubscriptionStudent(null);
          }}
          onSuccess={async () => {
            setMessageStatus('Réabonnement enregistré avec succès');
            if (hookResult?.refresh) {
              await hookResult.refresh();
            }
          }}
        />
      )}

      {showOutOfServiceMonths && (
        <OutOfServiceMonthsManager
          onClose={() => setShowOutOfServiceMonths(false)}
        />
      )}

      {showRemindersConfig && (
        <RemindersConfigModal
          onClose={() => setShowRemindersConfig(false)}
        />
      )}

      {showReminderSender && (
        <ReminderSenderModal
          students={students}
          lines={lineOptions}
          onClose={() => setShowReminderSender(false)}
          onSuccess={async ({ successCount, errorCount }) => {
            setMessageStatus(`${successCount} rappel(s) envoyé(s) avec succès.${errorCount > 0 ? ` ${errorCount} erreur(s).` : ''}`);
            await educatorLog({
              action: 'reminder:bulk',
              description: `Envoi groupé de rappels (${successCount} succès, ${errorCount} erreurs)`,
            });
          }}
        />
      )}

      {showScanHistory && (
        <ScanHistoryViewer
          onClose={() => setShowScanHistory(false)}
        />
      )}

      {showAccounting && (
        <AccountingModule
          students={students}
          lines={lineOptions}
          onClose={() => setShowAccounting(false)}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            setMessageStatus('Mot de passe modifié avec succès !');
            setTimeout(() => setMessageStatus(''), 3000);
          }}
        />
      )}

    </main>
  );
}

// Composant modal de modification de mot de passe
function ChangePasswordModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.currentPassword) {
      setError('Veuillez entrer votre mot de passe actuel');
      return;
    }
    
    if (!formData.newPassword || formData.newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await changeOwnPassword(formData.currentPassword, formData.newPassword);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div className="card modal-enter" style={{ maxWidth: '500px', width: '100%' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--success" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <Key size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Modifier mon mot de passe</h2>
          </div>
          <button
            className="button button--subtle"
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem' }}
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Mot de passe actuel *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                className="form-input"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="Entrez votre mot de passe actuel"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="button button--subtle"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                style={{ padding: '0.5rem' }}
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Nouveau mot de passe *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                className="form-input"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Minimum 6 caractères"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="button button--subtle"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                style={{ padding: '0.5rem' }}
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Confirmer le nouveau mot de passe *</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                className="form-input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirmez le nouveau mot de passe"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="button button--subtle"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                style={{ padding: '0.5rem' }}
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="button button--subtle"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="button"
              disabled={loading}
            >
              {loading ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Composant modal de gestion des utilisateurs (Admin seulement)
function UserManagerModal({ users = [], currentUserId, onClose, onCreate, onUpdate, onDelete }) {
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'educator',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [resettingPasswordFor, setResettingPasswordFor] = useState(null);
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const handleNewUser = () => {
    setEditingUser('new');
    setFormData({ email: '', password: '', name: '', role: 'educator' });
    setErrors({});
  };

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setFormData({
      email: user.email,
      password: '', // Ne pas afficher le mot de passe
      name: user.name || '',
      role: user.role || 'educator',
    });
    setErrors({});
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', name: '', role: 'educator' });
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email?.trim()) {
      newErrors.email = 'Email obligatoire';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Format email invalide';
    }
    if (editingUser === 'new' && !formData.password?.trim()) {
      newErrors.password = 'Mot de passe obligatoire';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    if (!formData.name?.trim()) {
      newErrors.name = 'Nom obligatoire';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (editingUser === 'new') {
        await onCreate({
          email: formData.email.trim(),
          password: formData.password.trim(),
          name: formData.name.trim(),
          role: formData.role,
        });
      } else {
        const updates = {
          name: formData.name.trim(),
          role: formData.role,
        };
        if (formData.password?.trim()) {
          updates.password = formData.password.trim();
        }
        await onUpdate(editingUser, updates);
      }
      handleCancel();
    } catch (err) {
      setErrors({ submit: err.message || 'Erreur lors de la sauvegarde' });
    }
  };

  const handleDeleteUser = async (user) => {
    const isSelf = user.id === currentUserId;
    
    // ✅ NOUVEAU : Confirmation renforcée pour auto-suppression
    if (isSelf) {
      // Étape 1 : Saisie de confirmation textuelle
      const confirmation = window.prompt(
        '⚠️ ATTENTION : Vous allez supprimer votre propre compte administrateur.\n\n' +
        'Cette action est IRRÉVERSIBLE et vous serez immédiatement déconnecté.\n\n' +
        'Pour confirmer, tapez exactement : SUPPRIMER MON COMPTE'
      );
      
      if (confirmation !== 'SUPPRIMER MON COMPTE') {
        alert('❌ Confirmation incorrecte. Suppression annulée.');
        return;
      }
      
      // Étape 2 : Double confirmation
      const finalConfirm = window.confirm(
        '🚨 DERNIÈRE CONFIRMATION\n\n' +
        'Êtes-vous ABSOLUMENT SÛR de vouloir supprimer votre compte administrateur ?\n\n' +
        'Cliquez sur OK pour confirmer la suppression définitive.'
      );
      
      if (!finalConfirm) {
        alert('Suppression annulée.');
        return;
      }
    } else {
      // Suppression normale pour les autres utilisateurs
      const confirmMessage = `Supprimer l'utilisateur "${user.name || user.email}" ?\n\nCette action est irréversible.`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    
    try {
      await onDelete(user.id);
      // La déconnexion et redirection sont gérées dans onDelete si auto-suppression
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div className="card modal-enter" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--success" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <UserCog size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Gestion des utilisateurs</h2>
          </div>
          <button
            className="button button--subtle"
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem' }}
          >
            <X size={20} />
          </button>
        </header>

        <div style={{ marginBottom: '1.5rem' }}>
          <button className="button" type="button" onClick={handleNewUser}>
            <Plus size={16} /> Ajouter un utilisateur
          </button>
        </div>

        {(editingUser === 'new' || editingUser) && (
          <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              {editingUser === 'new' ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Email *</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="exemple@email.com"
                disabled={editingUser !== 'new'}
                autoFocus
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Nom *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom complet"
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Mot de passe {editingUser === 'new' ? '*' : '(laisser vide pour ne pas changer)'}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser === 'new' ? 'Minimum 6 caractères' : 'Nouveau mot de passe (optionnel)'}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="button button--subtle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ padding: '0.5rem' }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Rôle *</label>
              <select
                className="form-input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="educator">Éducateur</option>
                <option value="admin">Admin</option>
              </select>
              <small className="subtitle" style={{ display: 'block', marginTop: '0.25rem' }}>
                Admin : peut créer d'autres comptes. Éducateur : accès complet sauf création de comptes.
              </small>
            </div>

            {errors.submit && (
              <div className="form-error" style={{ marginBottom: '1rem' }}>{errors.submit}</div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="button button--subtle" onClick={handleCancel}>
                Annuler
              </button>
              <button type="submit" className="button">
                <Save size={16} /> {editingUser === 'new' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {users.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <p>Aucun utilisateur enregistré.</p>
            </div>
          ) : (
            users.map((user, index) => (
              <div key={user.id} className="card stagger-item" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h4 className="section-title" style={{ margin: 0, fontSize: '1rem' }}>
                      {user.name}
                      {user.role === 'admin' && <Crown size={14} style={{ marginLeft: '0.5rem', color: '#f59e0b' }} />}
                    </h4>
                    <span className={`chip ${user.role === 'admin' ? 'chip--primary' : ''}`} style={{ fontSize: '0.75rem' }}>
                      {user.role === 'admin' ? 'Admin' : 'Éducateur'}
                    </span>
                  </div>
                  <p className="subtitle" style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    {user.email}
                  </p>
                  {user.lastLogin && (
                    <p className="subtitle" style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      Dernière connexion: {new Date(user.lastLogin).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="button button--subtle"
                    type="button"
                    onClick={() => handleEdit(user)}
                    disabled={user.id === currentUserId}
                    title={user.id === currentUserId ? 'Vous ne pouvez pas modifier votre propre compte' : 'Modifier'}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="button button--subtle"
                    type="button"
                    onClick={() => setResettingPasswordFor(user)}
                    title="Réinitialiser le mot de passe"
                  >
                    <Key size={16} />
                  </button>
                  <button
                    className="button button--subtle"
                    type="button"
                    onClick={() => handleDeleteUser(user)}
                    style={{ color: '#dc2626' }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {resettingPasswordFor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '2rem'
        }}>
          <div className="card modal-enter" style={{ maxWidth: '500px', width: '100%' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="badge badge--warning" style={{ padding: '0.5rem', borderRadius: '12px' }}>
                  <Key size={20} />
                </div>
                <h2 className="section-title" style={{ margin: 0 }}>Réinitialiser le mot de passe</h2>
              </div>
              <button
                className="button button--subtle"
                type="button"
                onClick={() => {
                  setResettingPasswordFor(null);
                  setResetPasswordData({ newPassword: '', confirmPassword: '' });
                  setResetPasswordError('');
                }}
                style={{ padding: '0.5rem' }}
              >
                <X size={20} />
              </button>
            </header>

            <div style={{ marginBottom: '1rem' }}>
              <p className="subtitle">
                Réinitialiser le mot de passe pour <strong>{resettingPasswordFor.name}</strong> ({resettingPasswordFor.email})
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setResetPasswordError('');
              
              if (!resetPasswordData.newPassword || resetPasswordData.newPassword.length < 6) {
                setResetPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères');
                return;
              }
              
              if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
                setResetPasswordError('Les mots de passe ne correspondent pas');
                return;
              }

              setResetPasswordLoading(true);
              try {
                await resetUserPassword(resettingPasswordFor.id, resetPasswordData.newPassword);
                setResettingPasswordFor(null);
                setResetPasswordData({ newPassword: '', confirmPassword: '' });
                setResetPasswordError('');
                alert('Mot de passe réinitialisé avec succès !');
              } catch (err) {
                setResetPasswordError(err.message || 'Erreur lors de la réinitialisation du mot de passe');
              } finally {
                setResetPasswordLoading(false);
              }
            }}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Nouveau mot de passe *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                  placeholder="Minimum 6 caractères"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Confirmer le nouveau mot de passe *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                  placeholder="Confirmez le nouveau mot de passe"
                  required
                />
              </div>

              {resetPasswordError && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#DC2626' }}>
                  {resetPasswordError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="button button--subtle"
                  onClick={() => {
                    setResettingPasswordFor(null);
                    setResetPasswordData({ newPassword: '', confirmPassword: '' });
                    setResetPasswordError('');
                  }}
                  disabled={resetPasswordLoading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="button"
                  disabled={resetPasswordLoading}
                >
                  {resetPasswordLoading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant Modal de Bilan Mensuel avec double comptabilité
function MonthlyBalanceModal({ open, onClose, students = [] }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [paymentsEncaisse, setPaymentsEncaisse] = useState([]);
  const [paymentsComptabilise, setPaymentsComptabilise] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Charger les données du mois sélectionné
  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [encaisses, comptabilises] = await Promise.all([
          fetchPaymentsByMonth(selectedYear, selectedMonth),
          fetchActivePaymentsForMonth(selectedYear, selectedMonth),
        ]);
        setPaymentsEncaisse(encaisses);
        setPaymentsComptabilise(comptabilises);
      } catch (err) {
        console.error('Erreur chargement bilan mensuel:', err);
        setError(err.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [open, selectedYear, selectedMonth]);

  // Calculer les totaux
  const totalEncaisse = paymentsEncaisse.reduce((sum, p) => sum + (p.montantTotal || 0), 0);
  const totalComptabilise = paymentsComptabilise.reduce((sum, p) => sum + (p.montantMensuel || 0), 0);
  const nombreAbonnementsActifs = paymentsComptabilise.length;

  // Créer un lookup pour les noms d'étudiants
  const studentLookup = useMemo(() => {
    return Object.fromEntries(students.map(s => [s.id, s.name]));
  }, [students]);

  if (!open) return null;

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div className="card" style={{ maxWidth: '1000px', width: '100%', maxHeight: '90vh', overflow: 'auto', background: '#ffffff' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #facc15' }}>
          <div>
            <h2 className="section-title" style={{ margin: 0, background: 'linear-gradient(135deg, #facc15 0%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              📊 Bilan Mensuel Financier
            </h2>
            <p className="subtitle" style={{ marginTop: '0.25rem' }}>Double comptabilité : Trésorerie et Répartition mensuelle</p>
          </div>
          <button
            className="button button--subtle"
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem' }}
          >
            <X size={20} />
          </button>
        </header>

        {/* Sélecteur de mois/année */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <label className="layout-grid" style={{ gap: '0.4rem', flex: 1 }}>
            <span style={{ fontWeight: 600 }}>Mois</span>
            <select
              className="input-field"
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
          </label>
          <label className="layout-grid" style={{ gap: '0.4rem', flex: 1 }}>
            <span style={{ fontWeight: 600 }}>Année</span>
            <select
              className="input-field"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="subtitle">Chargement des données...</p>
          </div>
        ) : error ? (
          <div className="card" style={{ padding: '1rem', background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(220, 38, 38, 0.4)' }}>
            <p className="subtitle" style={{ color: '#b91c1c', margin: 0 }}>❌ {error}</p>
          </div>
        ) : (
          <>
            {/* Vue d'ensemble avec deux colonnes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              {/* Revenus encaissés */}
              <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)', border: '2px solid #facc15' }}>
                <h3 className="section-title" style={{ marginBottom: '0.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  💰 Revenus Encaissés (Trésorerie)
                  <HelpTooltip text={`Argent réellement reçu ce mois. Total des paiements enregistrés en ${selectedMonth}/${selectedYear}.`} />
                </h3>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  {totalEncaisse.toLocaleString('fr-FR')} FCFA
                </div>
                <p className="subtitle" style={{ margin: 0, fontSize: '0.85rem' }}>
                  {paymentsEncaisse.length} paiement{paymentsEncaisse.length > 1 ? 's' : ''} reçu{paymentsEncaisse.length > 1 ? 's' : ''}
                </p>
              </div>

              {/* Revenus comptabilisés */}
              <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', border: '2px solid #22c55e' }}>
                <h3 className="section-title" style={{ marginBottom: '0.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📈 Revenus Comptabilisés (Répartition)
                  <HelpTooltip text="Répartition mensuelle des abonnements. Pour chaque abonnement actif ce mois, on compte montantTotal/nombreMois." />
                </h3>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  {totalComptabilise.toLocaleString('fr-FR')} FCFA
                </div>
                <p className="subtitle" style={{ margin: 0, fontSize: '0.85rem' }}>
                  {nombreAbonnementsActifs} abonnement{nombreAbonnementsActifs > 1 ? 's' : ''} actif{nombreAbonnementsActifs > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Liste des paiements encaissés */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1rem' }}>
                💰 Paiements Encaissés ({paymentsEncaisse.length})
              </h3>
              {paymentsEncaisse.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  <p>Aucun paiement enregistré ce mois.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {paymentsEncaisse.map(payment => (
                    <div key={payment.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef9c3' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {studentLookup[payment.studentId] || 'Étudiant inconnu'}
                        </div>
                        <div className="subtitle" style={{ fontSize: '0.85rem' }}>
                          {payment.dateEnregistrement ? new Date(payment.dateEnregistrement).toLocaleDateString('fr-FR') : 'Date inconnue'} • 
                          {payment.nombreMois} mois • 
                          Enregistré par {payment.educateurNom}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                          {payment.montantTotal.toLocaleString('fr-FR')} FCFA
                        </div>
                        <div className="subtitle" style={{ fontSize: '0.75rem' }}>
                          {payment.montantMensuel.toLocaleString('fr-FR')} FCFA/mois
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liste des abonnements actifs (comptabilisés) */}
            <div>
              <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1rem' }}>
                📈 Abonnements Actifs - Répartition Mensuelle ({paymentsComptabilise.length})
              </h3>
              {paymentsComptabilise.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  <p>Aucun abonnement actif ce mois.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {paymentsComptabilise.map(payment => (
                    <div key={payment.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#dcfce7' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {studentLookup[payment.studentId] || 'Étudiant inconnu'}
                        </div>
                        <div className="subtitle" style={{ fontSize: '0.85rem' }}>
                          Du {payment.dateDebut ? new Date(payment.dateDebut).toLocaleDateString('fr-FR') : 'N/A'} au {payment.dateFin ? new Date(payment.dateFin).toLocaleDateString('fr-FR') : 'N/A'} • 
                          {payment.nombreMois} mois • 
                          Total: {payment.montantTotal.toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                          {payment.montantMensuel.toLocaleString('fr-FR')} FCFA
                        </div>
                        <div className="subtitle" style={{ fontSize: '0.75rem' }}>
                          Part mensuelle
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Composant d'aide contextuelle (réutilisable)
function HelpTooltip({ text }) {
  const [show, setShow] = useState(false);
  if (!text) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '0.25rem' }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(!show); }}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}
        title="Aide"
      >
        <HelpCircle size={14} />
      </button>
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '0.5rem',
            background: '#1e293b',
            color: '#ffffff',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            maxWidth: '280px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            whiteSpace: 'pre-line',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>💡 Aide</span>
            <button type="button" onClick={() => setShow(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', padding: 0 }}>
              <X size={14} />
            </button>
          </div>
          <div>{text}</div>
          <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1e293b' }} />
        </div>
      )}
    </span>
  );
}

function statusLabel(status) {
  switch (status) {
    case PAYMENT_STATUS.UP_TO_DATE:
      return 'à jour';
    case PAYMENT_STATUS.LATE:
      return 'en retard';
    case PAYMENT_STATUS.OUT_OF_SERVICE:
      return 'suspendu';
    default:
      return 'inconnu';
  }
}

function computeStats(students) {
  if (!Array.isArray(students)) {
    return { total: 0, byStatus: { up_to_date: 0, late: 0, out_of_service: 0, expired: 0, unknown: 0 }, estimatedRevenue: 0, lines: 0 };
  }
  const total = students.length;
  const byStatus = students.reduce(
    (accumulator, student) => {
      if (!student) return accumulator;
      const key = student.paymentStatus || 'unknown';
      accumulator[key] = (accumulator[key] || 0) + 1;
      try {
        if (!isSubscriptionActive(student)) {
          accumulator.expired = (accumulator.expired || 0) + 1;
        }
      } catch (err) {
        console.warn('Erreur isSubscriptionActive:', err);
      }
      return accumulator;
    },
    { up_to_date: 0, late: 0, out_of_service: 0, expired: 0, unknown: 0 },
  );
  const estimatedRevenue = students.reduce((sum, student) => {
    if (!student) return sum;
    return sum + (Number(student.monthlyFee) || 0);
  }, 0);
  const lines = new Set(students.map(student => student?.busLine).filter(Boolean)).size;
  return { total, byStatus, estimatedRevenue, lines };
}
