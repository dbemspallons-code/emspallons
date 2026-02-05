import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, Users, UserPlus, DollarSign, Calendar, AlertCircle, 
  Search, Filter, Download, Upload, Settings, HelpCircle, 
  Lock, Unlock, Plus, Edit2, Trash2, FileText, Send, 
  BarChart3, TrendingUp, Clock, CheckCircle2, XCircle, History, QrCode, ShieldCheck
} from 'lucide-react';
import { logout, isAdmin } from '../services/authService';
import { getOutboxLength, triggerSync } from '../services/offlineService';
import { 
  getAllStudents, createStudent, updateStudent, deleteStudent,
  getAllPayments, createPayment, deletePayment, getPaymentsByStudentId,
  calculateStudentStatus, getRevenusEncaisses, getRevenusComptabilises,
  replaceAllData
} from '../services/studentService';
import { generateReceiptPDF, generateReceiptHTML, generateReceiptWhatsAppMessage } from '../services/receiptService';
import { openWhatsAppWithMessage } from '../services/whatsappService';
import { exportStudentsCSV, exportPaymentsCSV, exportAllJSON, importJSON, importStudentsCSV } from '../services/exportService';
import { clearStudentsAndPayments } from '../services/studentService';
import { qrCodeService } from '../services/qrCodeService';
import StudentFormModal from './StudentFormModal';
import PaymentFormModal from './PaymentFormModal';
import ReceiptModal from './ReceiptModal';
import UserManagementModal from './UserManagementModal';
import MonthlyReport from './MonthlyReport';
import HelpTooltip from './HelpTooltip';
import HistoryViewer from './HistoryViewer';
import SettingsModal from './SettingsModal';
import NoticeModal from './NoticeModal';
import ControllerManagementModal from './ControllerManagementModal';

export default function Dashboard({ user, onLogout }) {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [showControllerManagement, setShowControllerManagement] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [queuedCount, setQueuedCount] = useState(0);
  const [showQueuedToast, setShowQueuedToast] = useState(false);

  useEffect(() => {
    loadData();
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
      const [studentsData, paymentsData] = await Promise.all([
        getAllStudents(),
        getAllPayments(),
      ]);
      setStudents(studentsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkAdminStatus() {
    const admin = await isAdmin();
    setIsAdminUser(admin);
  }

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

  // Filtrer les étudiants
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filtre de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.nom.toLowerCase().includes(term) ||
        s.prenom.toLowerCase().includes(term) ||
        s.classe.toLowerCase().includes(term) ||
        s.contact.toLowerCase().includes(term)
      );
    }

    // Filtre de statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => {
        const studentPayments = payments.filter(p => p.studentId === s.id);
        const status = calculateStudentStatus(s, studentPayments);
        return status.statut === statusFilter;
      });
    }

    return filtered;
  }, [students, payments, searchTerm, statusFilter]);

  async function handleSaveStudent(studentData) {
    try {
      if (selectedStudent && selectedStudent.id) {
        // Mise à jour
        await updateStudent(selectedStudent.id, studentData);
      } else {
        // Création
        await createStudent(studentData);
      }
      await loadData();
      setShowStudentForm(false);
      setSelectedStudent(null);
    } catch (error) {
      console.error('Erreur sauvegarde étudiant:', error);
      throw error;
    }
  }

  async function handleCreatePayment(paymentData) {
    try {
      const newPayment = await createPayment(paymentData);
      await loadData();
      setShowPaymentForm(false);
      setSelectedStudent(null);
      
      // Générer et afficher le reçu
      const student = students.find(s => s.id === paymentData.studentId);
      if (student) {
        setSelectedPayment(newPayment);
        setSelectedStudent(student);
        setShowReceipt(true);
      }
      
      return newPayment;
    } catch (error) {
      console.error('Erreur création paiement:', error);
      throw error;
    }
  }

  async function handleDeleteStudent(studentId) {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet étudiant ?')) {
      return;
    }
    try {
      await deleteStudent(studentId);
      await loadData();
    } catch (error) {
      console.error('Erreur suppression étudiant:', error);
      alert('Erreur lors de la suppression');
    }
  }

  function handleViewReceipt(payment) {
    const student = students.find(s => s.id === payment.studentId);
    if (student) {
      setSelectedPayment(payment);
      setSelectedStudent(student);
      setShowReceipt(true);
    }
  }

  function handleSendReceiptWhatsApp(payment) {
    const student = students.find(s => s.id === payment.studentId);
    if (student && student.contact) {
      const message = generateReceiptWhatsAppMessage({ student, payment });
      openWhatsAppWithMessage(student.contact, message);
    } else {
      alert('Contact manquant pour cet étudiant');
    }
  }

  function handleDownloadReceiptPDF(payment) {
    const student = students.find(s => s.id === payment.studentId);
    if (student) {
      generateReceiptPDF({ student, payment });
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

      setMessage('Carte QR téléchargée avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur téléchargement carte QR:', error);
      setMessage(`Erreur téléchargement carte QR: ${error.message || 'Action impossible'}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleExportStudents() {
    try {
      await exportStudentsCSV();
      setMessage('Export CSV des étudiants réussi');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur export: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleExportPayments() {
    try {
      await exportPaymentsCSV();
      setMessage('Export CSV des paiements réussi');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur export: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleExportAll() {
    try {
      await exportAllJSON();
      setMessage('Export JSON complet réussi');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`Erreur export: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    }
  }

  async function handleImportJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const data = await importJSON(file);
      
      // Demander confirmation avant d'importer
      if (!window.confirm(
        `Importer ${data.students.length} étudiant(s) et ${data.payments.length} paiement(s) ?\n\n` +
        `⚠️ ATTENTION: Cela remplacera toutes les données existantes !`
      )) {
        return;
      }

      // Importer les données
      setMessage('Import en cours...');
      await replaceAllData({
        students: data.students || [],
        payments: data.payments || [],
      });
      setMessage(`Import réussi: ${data.students.length} étudiant(s) et ${data.payments.length} paiement(s)`);
      await loadData();
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage(`Erreur import: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
      event.target.value = ''; // Réinitialiser l'input
    }
  }

  async function handleImportCSV(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const studentsData = await importStudentsCSV(file);
      
      if (!window.confirm(
        `Importer ${studentsData.length} étudiant(s) ?`
      )) {
        return;
      }

      // Créer les étudiants
      for (const studentData of studentsData) {
        try {
          await createStudent(studentData);
        } catch (error) {
          console.error('Erreur création étudiant:', error);
        }
      }

      setMessage(`${studentsData.length} étudiant(s) importé(s) avec succès`);
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
      `⚠️ ATTENTION: Cette action est IRRÉVERSIBLE !\n\n` +
      `Toutes les données seront supprimées :\n` +
      `- Tous les étudiants\n` +
      `- Tous les paiements\n\n` +
      `Les utilisateurs ne seront PAS supprimés.\n\n` +
      `Tapez "${confirmText}" pour confirmer :`
    );

    if (userInput !== confirmText) {
      setShowResetConfirm(false);
      setMessage('Réinitialisation annulée');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      setLoading(true);
      await clearStudentsAndPayments();
      setMessage('Toutes les données ont été supprimées. Rechargement...');
      await loadData();
      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (error) {
      setMessage(`Erreur réinitialisation: ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
      setShowResetConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-green-500 bg-clip-text text-transparent">
                EMSP Allons — Back-office
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.nom}</p>
                <p className="text-xs text-gray-500">{user.role === 'admin' ? 'Administrateur' : 'Éducateur'}</p>
              </div>
              <button
                onClick={() => setShowControllerManagement(true)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                title="Gérer les contrôleurs"
              >
                <ShieldCheck className="w-4 h-4 inline mr-2" />
                Contrôleurs
              </button>
              <button
                onClick={() => setShowNotice(true)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                title="Notice d'utilisation"
              >
                <HelpCircle className="w-4 h-4 inline mr-2" />
                Notice
              </button>
              {isAdminUser && (
                <>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    title="Paramètres"
                  >
                    <Settings className="w-4 h-4 inline mr-2" />
                    Paramètres
                  </button>
                  <div className="relative">
                    <button
                      onClick={handleExportAll}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                      title="Exporter toutes les données"
                    >
                      <Download className="w-4 h-4 inline mr-2" />
                      Export
                    </button>
                  </div>
                  <label className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition cursor-pointer">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Import
                    <input
                      type="file"
                      accept=".json,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.name.endsWith('.json')) {
                          handleImportJSON(e);
                        } else if (file.name.endsWith('.csv')) {
                          handleImportCSV(e);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleReset}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                      showResetConfirm
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'text-red-600 bg-red-50 hover:bg-red-100'
                    }`}
                    title="Réinitialiser toutes les données"
                  >
                    <Trash2 className="w-4 h-4 inline mr-2" />
                    {showResetConfirm ? 'Confirmer' : 'Réinitialiser'}
                  </button>
                  <button
                    onClick={() => setShowUserManagement(true)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
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
                  className="inline-flex items-center gap-2 bg-yellow-500 text-white px-3 py-2 rounded-full shadow hover:bg-yellow-600"
                  title="Opérations en file (cliquer pour synchroniser)"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10v6a2 2 0 0 1-2 2H7" />
                    <path d="M3 6v6a2 2 0 0 0 2 2h12" />
                  </svg>
                  <span className="text-sm font-semibold">{queuedCount}</span>
                </button>
              )}

              {showQueuedToast && (
                <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                  🔁 Synchronisation demandée
                </div>
              )}

              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
              >
                <LogOut className="w-4 h-4 inline mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Aperçu
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'students'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Étudiants
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'monthly'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Bilan mensuel
            </button>
            {isAdminUser && (
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
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
            message.includes('réussi') || message.includes('succès')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.includes('Erreur') || message.includes('annulée')
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
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
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
            onViewReceipt={handleViewReceipt}
            onSendReceipt={handleSendReceiptWhatsApp}
            onDownloadReceipt={handleDownloadReceiptPDF}
            onExportStudents={isAdminUser ? handleExportStudents : undefined}
            onExportPayments={isAdminUser ? handleExportPayments : undefined}
            onDownloadQR={handleDownloadQRCard}
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

      {showReceipt && selectedStudent && selectedPayment && (
        <ReceiptModal
          student={selectedStudent}
          payment={selectedPayment}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
            setSelectedStudent(null);
          }}
          onSendWhatsApp={() => handleSendReceiptWhatsApp(selectedPayment)}
          onDownloadPDF={() => handleDownloadReceiptPDF(selectedPayment)}
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
          onClose={() => setShowSettings(false)}
          isAdmin={isAdminUser}
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
          title="Total étudiants"
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
          title="Expire bientôt"
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
          title="Expirés"
          value={stats.expire}
          icon={XCircle}
          color="red"
        />
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="flex gap-4">
          <button
            onClick={onAddStudent}
            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition"
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Ajouter un étudiant
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
    <div className="bg-white rounded-lg shadow p-6">
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Alertes</h2>
        <p className="text-gray-500">Aucune alerte pour le moment</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
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
                className="px-3 py-1 text-sm bg-yellow-400 text-white rounded hover:bg-yellow-500 transition"
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
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onAddPayment,
  onViewReceipt,
  onSendReceipt,
  onDownloadReceipt,
  onExportStudents,
  onExportPayments,
  onDownloadQR,
}) {
  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher un étudiant..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="ACTIF">Actifs</option>
            <option value="EXPIRE_BIENTOT">Expire bientôt</option>
            <option value="RETARD">En retard</option>
            <option value="EXPIRE">Expirés</option>
            <option value="AUCUN">Aucun abonnement</option>
          </select>
          <button
            onClick={onAddStudent}
            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Ajouter
          </button>
          {onExportStudents && (
            <button
              onClick={onExportStudents}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              title="Exporter les étudiants en CSV"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export CSV
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
        </div>
      </div>

      {/* Liste des étudiants */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Étudiant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Classe
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
                  payments={studentPayments}
                  onEdit={onEditStudent}
                  onDelete={onDeleteStudent}
                  onAddPayment={onAddPayment}
                  onViewReceipt={onViewReceipt}
                  onSendReceipt={onSendReceipt}
                  onDownloadReceipt={onDownloadReceipt}
                  onDownloadQR={onDownloadQR}
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
  payments,
  onEdit,
  onDelete,
  onAddPayment,
  onViewReceipt,
  onSendReceipt,
  onDownloadReceipt,
  onDownloadQR,
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
        {student.classe || 'N/A'}
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
              title="Télécharger la carte QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
          {payments.length > 0 && (
            <>
              <button
                onClick={() => onViewReceipt(payments[0])}
                className="text-blue-600 hover:text-blue-900"
                title="Voir le reçu"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSendReceipt(payments[0])}
                className="text-green-600 hover:text-green-900"
                title="Envoyer par WhatsApp"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
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
            className="text-red-600 hover:text-red-900"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

