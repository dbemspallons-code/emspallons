import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import { qrCodeService } from '../services/qrCodeService';
import { getStudentByIdFromFirestore } from '../services/firestoreSyncService';
import { computePaymentStatus, PAYMENT_STATUS } from '../models/entities';
import { fetchGlobalSettings } from '../services/firestoreService';
import { getLastScan, setLastScan, logScan as logScanEntry } from '../services/scanService';
import { getOutboxLength, triggerSync } from '../services/offlineService';
import { authenticateController, getControllerSession, clearControllerSession, saveControllerSession } from '../services/controllerService';

const SCAN_RESET_TIMEOUT = 6000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export default function ControllerScan() {
  const [authorized, setAuthorized] = useState(false);
  const [settings, setSettings] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [controllerInfo, setControllerInfo] = useState(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [showQueuedToast, setShowQueuedToast] = useState(false);

  useEffect(() => {
    loadSettings();
    // Vérifier si une session contrôleur existe déjà
    const session = getControllerSession();
    if (session) {
      setAuthorized(true);
      setControllerInfo(session);
    }

    // Initialiser le badge de file avec les éléments en attente
    (async () => {
      try {
        const len = await getOutboxLength();
        if (typeof len === 'number' && len > 0) setQueuedCount(len);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Écouter les messages du service worker pour mettre à jour le badge de file d'attente
  useEffect(() => {
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
      return () => {
        navigator.serviceWorker.removeEventListener('message', onMessage);
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (authorized && !isScanning) {
      startScanner();
    }
    return () => {
      if (scannerInstance) {
        scannerInstance.clear().catch(() => {});
        setScannerInstance(null);
      }
    };
  }, [authorized]);

  async function loadSettings() {
    // Charger les paramètres depuis Firestore
    try {
      const appSettings = await fetchGlobalSettings();
    setSettings(appSettings);
    } catch (error) {
      console.warn('Erreur chargement paramètres:', error);
      setSettings({});
    }
    // Vérifier aussi l'ancien système pour compatibilité
    const flag = sessionStorage.getItem('controller_authorized');
    if (flag === 'true' && !getControllerSession()) {
      setAuthorized(true);
    }
  }

  async function handleAuthorize(e) {
    e.preventDefault();
    setAuthError('');
    
    if (!accessCode.trim()) {
      setAuthError('Veuillez entrer un code d\'accès');
      return;
    }

    try {
      // Essayer d'abord Firestore pour synchronisation
      const { getControllerByCodeFromFirestore } = await import('../services/firestoreSyncService');
      let controller = await getControllerByCodeFromFirestore(accessCode);
      
      if (controller) {
        // Contrôleur trouvé dans Firestore
        if (controller.active === false) {
          setAuthError('Ce contrôleur est inactif. Contactez l\'administration.');
          return;
        }
        
        const sessionController = {
          id: controller.id,
          nom: controller.name || controller.nom,
          assignedLineId: controller.assignedLineId || null,
        };
        
        setAuthorized(true);
        setControllerInfo(sessionController);
        saveControllerSession(sessionController);
        setAuthError('');
        return;
      }
      
      // Fallback sur l'ancien système
      controller = await authenticateController(accessCode);
      
      // Charger les infos Firestore si disponibles
      try {
        const { getAllControllersFromFirestore } = await import('../services/firestoreSyncService');
        const firestoreControllers = await getAllControllersFromFirestore();
        const firestoreController = firestoreControllers.find(c => c.id === controller.id || c.name === controller.nom);
        if (firestoreController) {
          controller.assignedLineId = firestoreController.assignedLineId || null;
        }
      } catch (firestoreErr) {
        console.warn('Impossible de récupérer les infos Firestore du contrôleur:', firestoreErr);
      }
      
      setAuthorized(true);
      setControllerInfo(controller);
      setAuthError('');
    } catch (err) {
      // Fallback sur l'ancien système si le nouveau échoue
      if (settings && accessCode.trim().toUpperCase() === (settings.controllerAccessCode || '').toUpperCase()) {
        setAuthorized(true);
        setAuthError('');
        sessionStorage.setItem('controller_authorized', 'true');
      } else {
        setAuthError(err.message || 'Code invalide. Contactez l\'administration.');
      }
    }
  }

  function startScanner() {
    setIsScanning(true);
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
      },
      false,
    );
    scanner.render(handleScanSuccess, handleScanError);
    setScannerInstance(scanner);
  }

  async function handleScanSuccess(decodedText) {
    if (scannerInstance) {
      scannerInstance.clear().catch(() => {});
    }

    setIsScanning(false);
    const now = Date.now();

    // PRIORITÉ 1 : Validation format QR
    const qrData = qrCodeService.validateQR(decodedText);
    if (!qrData) {
      // Enregistrer le scan invalide
      const resInvalid = await logScanEntry(null, {
        status: 'INVALID',
        paymentStatus: 'ERROR',
        controllerId: controllerInfo?.id || null,
        controllerName: controllerInfo?.nom || null,
        reason: 'QR Code invalide',
      });
      if (resInvalid && resInvalid.offline) {
        setQueuedCount(c => c + 1);
        setShowQueuedToast(true);
        setTimeout(() => setShowQueuedToast(false), 3500);
      }
      showResult({
        success: false,
        status: 'INVALID',
        message: '❌ QR Code invalide',
        color: '#EF4444',
      });
      return;
    }

    // PRIORITÉ 2 : Récupération étudiant
    const student = await getStudentByIdFromFirestore(qrData.id);
    if (!student) {
      // Enregistrer le scan étudiant introuvable
      const resNotFound = await logScanEntry(qrData.id, {
        status: 'NOT_FOUND',
        paymentStatus: 'ERROR',
        controllerId: controllerInfo?.id || null,
        controllerName: controllerInfo?.nom || null,
        reason: 'Étudiant introuvable',
      });
      if (resNotFound && resNotFound.offline) {
        setQueuedCount(c => c + 1);
        setShowQueuedToast(true);
        setTimeout(() => setShowQueuedToast(false), 3500);
      }
      showResult({
        success: false,
        status: 'NOT_FOUND',
        message: '❌ Étudiant introuvable',
        color: '#EF4444',
      });
      return;
    }

    // PRIORITÉ 3 : Vérification DOUBLONS (AVANT ligne)
    const lastScan = await getLastScan(student.id);
    if (lastScan && now - lastScan.timestamp < ONE_HOUR_MS) {
      const minutesAgo = Math.floor((now - lastScan.timestamp) / 60000);
      const minutesLeft = Math.ceil((ONE_HOUR_MS - (now - lastScan.timestamp)) / 60000);
      
      // ✅ OPTION A : NE PAS ENREGISTRER les doublons (juste afficher l'erreur)
      // Ne pas appeler logScanEntry() pour les doublons
      
      showResult({
        success: false,
        status: 'DUPLICATE',
        student,
        message: `🚫 Déjà scanné il y a ${minutesAgo} min`,
        nextScanIn: minutesLeft,
        color: '#F97316',
      });
      return;
    }

    // PRIORITÉ 4 : Vérification LIGNE
    if (controllerInfo?.assignedLineId) {
      const { fetchLines } = await import('../services/firestoreService');
      const lines = await fetchLines();
      const controllerLine = lines.find(l => l.id === controllerInfo.assignedLineId);
      const studentLine = student.busLine;

      if (studentLine !== controllerInfo.assignedLineId) {
        const studentLineName = lines.find(l => l.id === studentLine)?.name || studentLine;
        const controllerLineName = controllerLine?.name || controllerInfo.assignedLineId;

        // ✅ Enregistrer avec statut WRONG_LINE (pas ERROR)
        const resWrongLine = await logScanEntry(student.id, {
      status: 'WRONG_LINE',
      paymentStatus: student.paymentStatus || 'ERROR',
      controllerId: controllerInfo?.id || null,
      controllerName: controllerInfo?.nom || null,
      reason: `Tentative de scan d'un étudiant d'une autre ligne (${studentLineName} vs ${controllerLineName})`,
    });
    if (resWrongLine && resWrongLine.offline) {
      setQueuedCount(c => c + 1);
      setShowQueuedToast(true);
      setTimeout(() => setShowQueuedToast(false), 3500);
    }

        showResult({
          success: false,
          status: 'WRONG_LINE',
          student,
          message: `❌ Cet abonné appartient à la ligne "${studentLineName}". Vous êtes assigné à la ligne "${controllerLineName}".`,
          color: '#EF4444',
        });
        return;
      }
    }

    // Calculer le statut de paiement directement depuis Firestore
    const paymentStatusValue = await computePaymentStatus(student);
    let paymentStatus;
    let displayResult;
    
    if (paymentStatusValue === PAYMENT_STATUS.UP_TO_DATE) {
      paymentStatus = 'PAID';
      const expiresAt = student.subscription?.expiresAt ? new Date(student.subscription.expiresAt) : null;
      displayResult = {
        success: true,
        status: 'PAID',
        student,
        message: '✅ Accès autorisé',
        color: '#10B981',
        validUntil: expiresAt?.toISOString() || null,
      };
      await setLastScan(student.id, { timestamp: now, status: paymentStatus });
    } else if (paymentStatusValue === PAYMENT_STATUS.LATE) {
      paymentStatus = 'GRACE';
      const { getSessionRange } = await import('../models/sessionCalendar');
      const { getSessionIdFromDate } = await import('../models/sessionCalendar');
      const currentSessionId = await getSessionIdFromDate(new Date());
      const { graceEnd } = await getSessionRange(currentSessionId);
      const daysLeft = Math.max(0, Math.ceil((graceEnd.getTime() - now) / (24 * 60 * 60 * 1000)));
      displayResult = {
        success: true,
        status: 'GRACE',
        student,
        message: `⚠️ Paiement en retard (${daysLeft} jour(s) restants)`,
        color: '#F59E0B',
        validUntil: graceEnd.toISOString(),
        warning: true,
      };
      await setLastScan(student.id, { timestamp: now, status: paymentStatus });
    } else {
      paymentStatus = 'EXPIRED';
      const expiresAt = student.subscription?.expiresAt ? new Date(student.subscription.expiresAt) : null;
      displayResult = {
        success: false,
        status: 'EXPIRED',
        student,
        message: '❌ Paiement expiré - Accès refusé',
        color: '#EF4444',
        expiredSince: expiresAt?.toISOString() || null,
      };
    }

    const resSuccess = await logScanEntry(student.id, {
      status: displayResult.status,
      paymentStatus,
      controllerId: controllerInfo?.id || null,
      controllerName: controllerInfo?.nom || null,
    });
    if (resSuccess && resSuccess.offline) {
      setQueuedCount(c => c + 1);
      setShowQueuedToast(true);
      setTimeout(() => setShowQueuedToast(false), 3500);
    }

    showResult(displayResult);
  }

  function handleScanError() {
    // we silently ignore continuous errors
  }

  function showResult(data) {
    setResult(data);
    if (navigator.vibrate) {
      if (data.success) {
        navigator.vibrate([200]);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
    setTimeout(() => {
      setResult(null);
      startScanner();
    }, SCAN_RESET_TIMEOUT);
  }

  const content = useMemo(() => {
    // Éviter les re-renders inutiles
    if (!authorized) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
          <form
            onSubmit={handleAuthorize}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6"
          >
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-green-500" />
                Accès Contrôleur
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Veuillez saisir le code fourni par l'éducatrice pour accéder au scanner.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code contrôleur
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent uppercase tracking-[0.3em]"
                required
              />
              {authError && <p className="text-sm text-red-600 mt-2">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition"
            >
              <ShieldCheck className="w-5 h-5" />
              Accéder au scan
            </button>
          </form>
        </div>
      );
    }

    if (result) {
      return <ScanResult result={result} />;
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🚌 Contrôle Bus Scolaire</h1>
            <p className="text-indigo-100 text-sm mt-1">
              Scannez le QR code de l&apos;étudiant pour valider l&apos;accès.
            </p>
            {controllerInfo?.nom && (
              <p className="text-indigo-200 text-xs mt-1">
                Contrôleur: {controllerInfo.nom}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {queuedCount > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="inline-flex items-center gap-2 bg-yellow-500 text-white px-3 py-1 rounded-full shadow cursor-pointer hover:bg-yellow-600"
                onClick={() => {
                  triggerSync();
                  setShowQueuedToast(true);
                  setTimeout(() => setShowQueuedToast(false), 3000);
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10v6a2 2 0 0 1-2 2H7" />
                  <path d="M3 6v6a2 2 0 0 0 2 2h12" />
                  <path d="M7 6h14M7 6v6" />
                </svg>
                <span className="text-sm font-semibold">{queuedCount}</span>
              </motion.div>
            )}

            {showQueuedToast && (
              <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                <p className="text-sm">🔁 Opération mise en file pour synchronisation</p>
              </motion.div>
            )}

            <button
              onClick={() => {
                clearControllerSession();
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-500/70 hover:bg-indigo-500 rounded-lg transition text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Redémarrer
            </button>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div id="qr-reader" className="w-full max-w-xl bg-black rounded-2xl overflow-hidden shadow-2xl" />
          <div className="mt-8 text-center">
            <p className="text-lg font-medium">📸 Positionnez le QR code dans le cadre</p>
            <p className="text-sm text-gray-400 mt-2">Le scan se déclenche automatiquement</p>
          </div>
        </main>
      </div>
    );
  }, [authorized, result, accessCode, authError, controllerInfo]);

  return content;
}

function ScanResult({ result }) {
  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen flex flex-col items-center justify-center p-8 text-white transition"
      style={{ backgroundColor: result.color }}
    >
      <div className="text-9xl">
        {result.status === 'PAID' && '✅'}
        {result.status === 'GRACE' && '⚠️'}
        {result.status === 'EXPIRED' && '❌'}
        {result.status === 'DUPLICATE' && '🚫'}
        {result.status === 'INVALID' && '❌'}
        {result.status === 'NOT_FOUND' && '❌'}
        {result.status === 'WRONG_LINE' && '🚫'}
      </div>

      {result.student && (
        <>
          <h2 className="text-4xl font-bold mt-6">{result.student.nom} {result.student.prenom}</h2>
          <p className="text-2xl mt-2">🎓 {result.student.classe || 'Classe inconnue'}</p>
        </>
      )}

      <div className="mt-6 bg-black/30 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 text-center">
        <p className="text-2xl font-semibold">{result.message}</p>
      </div>

      {result.status === 'GRACE' && (
        <div className="mt-6 bg-yellow-100/90 text-yellow-900 rounded-xl px-6 py-4 text-center max-w-md">
          Paiement en retard. Merci de prévenir l&apos;administration.
        </div>
      )}

      {result.status === 'DUPLICATE' && (
        <div className="mt-6 bg-white/90 text-orange-600 rounded-xl px-6 py-4 text-center max-w-md">
          Prochain scan possible dans {result.nextScanIn} minute(s).
        </div>
      )}
    </motion.div>
  );
}
