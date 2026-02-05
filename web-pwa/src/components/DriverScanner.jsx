import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  verifyQrToken,
  logScanAttempt,
  fetchStudentById,
} from '../services/firestoreService';
import { SCAN_STATUS, computeSubscriptionStatus } from '../models/entities';
import {
  Camera,
  StopCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Clock,
  RotateCw,
  RotateCcw,
  Maximize2,
  UserCheck,
} from 'lucide-react';

const STATUS_COLORS = {
  [SCAN_STATUS.APPROVED]: '#16a34a',
  [SCAN_STATUS.DUPLICATE]: '#f97316',
  [SCAN_STATUS.EXPIRED]: '#dc2626',
  [SCAN_STATUS.FRAUD]: '#b91c1c',
  [SCAN_STATUS.ERROR]: '#be123c',
};

const DEFAULT_HISTORY_LIMIT = 100; // Limite augmentée pour permettre 24h d'historique
const HISTORY_RETENTION_HOURS = 24; // Conserver l'historique pendant 24 heures

export default function DriverScanner({ driverId = 'driver-demo', controllerId, controllerName, location }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const lockRef = useRef(false);
  const lastTokenRef = useRef(null);

  const [active, setActive] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [manualToken, setManualToken] = useState('');
  const [frameRotation, setFrameRotation] = useState(0); // Rotation du cadre en degrés
  const [qrDetected, setQrDetected] = useState(false); // État de détection du QR code
  const [qrLocation, setQrLocation] = useState(null); // Position du QR code détecté
  // Le contrôleur est maintenant passé en prop depuis DriverScreen après authentification
  const activeControllerId = controllerId || driverId;
  const activeControllerName = controllerName || null;

  useEffect(() => {
    if (!active) {
      stopCamera();
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setError(null);
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError('Caméra non disponible sur cet appareil.');
        setActive(false);
        return;
      }
      try {
        // Essayer d'abord avec la caméra arrière (environment)
        let stream;
        try {
          // Utiliser uniquement des contraintes standard et minimales
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { ideal: 'environment' },
            },
          });
          
          // Une fois la caméra obtenue, essayer d'améliorer les paramètres progressivement
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack && videoTrack.applyConstraints) {
            try {
              // Essayer d'améliorer la résolution si possible (contraintes standard uniquement)
              await videoTrack.applyConstraints({
                width: { ideal: 1280 },
                height: { ideal: 720 },
              });
            } catch (constraintError) {
              // Si ça échoue, essayer avec moins de contraintes
              try {
                await videoTrack.applyConstraints({
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                });
              } catch (fallbackError) {
                // Utiliser les paramètres par défaut - pas grave
                console.log('Utilisation des paramètres par défaut de la caméra');
              }
            }
          }
        } catch (envError) {
          // Si la caméra arrière échoue, essayer la caméra avant
          console.warn('Caméra arrière non disponible, utilisation de la caméra avant', envError);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                facingMode: { ideal: 'user' },
              },
            });
            
            // Essayer d'améliorer les paramètres
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack && videoTrack.applyConstraints) {
              try {
                await videoTrack.applyConstraints({
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                });
              } catch (constraintError) {
                // Utiliser les paramètres par défaut
                console.log('Utilisation des paramètres par défaut de la caméra');
              }
            }
          } catch (userError) {
            // Dernière tentative : aucune contrainte spécifique
            console.warn('Tentative avec contraintes minimales', userError);
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
          }
        }
        
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        // Attendre que la vidéo soit prête
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play()
              .then(() => {
                resolve();
                scanLoop();
              })
              .catch(reject);
          };
          video.onerror = reject;
          // Timeout de sécurité
          setTimeout(() => reject(new Error('Timeout chargement vidéo')), 5000);
        });
      } catch (err) {
        console.error('Camera start failed', err);
        let errorMessage = "Impossible d'accéder à la caméra. ";
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage += "Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage += "Aucune caméra trouvée sur cet appareil.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage += "La caméra est déjà utilisée par une autre application.";
        } else {
          errorMessage += `Erreur: ${err.message || err.name}`;
        }
        setError(errorMessage);
        setActive(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  const scanLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    // Vérifier que la vidéo est prête
    if (video.readyState !== video.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      // Ajuster la taille du canvas à la vidéo
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      // Améliorer la qualité de l'image avant la détection
      ctx.imageSmoothingEnabled = false; // Désactiver le lissage pour préserver les détails
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Améliorer le contraste pour une meilleure détection
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Appliquer un léger contraste pour améliorer la détection
      for (let i = 0; i < data.length; i += 4) {
        // Convertir en niveaux de gris avec pondération optimale
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        // Améliorer le contraste
        const contrast = (gray - 128) * 1.2 + 128;
        const clamped = Math.max(0, Math.min(255, contrast));
        data[i] = clamped;     // R
        data[i + 1] = clamped; // G
        data[i + 2] = clamped; // B
        // Alpha reste inchangé
      }
      
      // Détection multi-résolution pour améliorer la détection automatique
      let code = null;
      let detectionScale = 1;
      
      // Essayer d'abord à la résolution normale
      code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      // Si pas de code, essayer avec une résolution réduite (zoom out effect)
      if (!code && canvas.width > 640) {
        const scale = 0.5;
        const scaledWidth = Math.floor(canvas.width * scale);
        const scaledHeight = Math.floor(canvas.height * scale);
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = scaledWidth;
        scaledCanvas.height = scaledHeight;
        const scaledCtx = scaledCanvas.getContext('2d');
        scaledCtx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight);
        const scaledImageData = scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        
        code = jsQR(scaledImageData.data, scaledWidth, scaledHeight, {
          inversionAttempts: 'attemptBoth',
        });
        detectionScale = scale;
      }

      // Si toujours pas de code, essayer avec une résolution agrandie (zoom in effect)
      if (!code && canvas.width < 1920) {
        const scale = 1.5;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const cropSize = Math.min(canvas.width, canvas.height) / scale;
        const cropX = Math.max(0, centerX - cropSize / 2);
        const cropY = Math.max(0, centerY - cropSize / 2);
        
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropSize;
        croppedCanvas.height = cropSize;
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(canvas, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);
        const croppedImageData = croppedCtx.getImageData(0, 0, cropSize, cropSize);
        
        code = jsQR(croppedImageData.data, cropSize, cropSize, {
          inversionAttempts: 'attemptBoth',
        });
        detectionScale = scale;
      }

      // Si pas de code trouvé, essayer avec d'autres paramètres
      if (!code) {
        code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
      }
      
      // Si toujours pas de code, essayer avec une meilleure qualité
      if (!code) {
        code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
          greyScaleWeights: {
            red: 0.299,
            green: 0.587,
            blue: 0.114,
          }
        });
      }

      // Mettre à jour l'état de détection pour le feedback visuel
      if (code?.location) {
        setQrDetected(true);
        // Calculer la position relative du QR code dans le cadre
        const qrCenterX = (code.location.topLeftCorner.x + code.location.topRightCorner.x + 
                          code.location.bottomLeftCorner.x + code.location.bottomRightCorner.x) / 4;
        const qrCenterY = (code.location.topLeftCorner.y + code.location.topRightCorner.y + 
                          code.location.bottomLeftCorner.y + code.location.bottomRightCorner.y) / 4;
        setQrLocation({
          x: qrCenterX / canvas.width,
          y: qrCenterY / canvas.height,
        });
      } else {
        setQrDetected(false);
        setQrLocation(null);
      }

      if (code?.data && !lockRef.current) {
        const token = code.data.trim();
        // Vérifier que le token a une longueur raisonnable (au moins 10 caractères)
        if (token.length >= 10 && token !== lastTokenRef.current) {
          lastTokenRef.current = token;
          handleToken(token);
        }
      }
    } catch (err) {
      console.warn('Erreur lors du scan QR:', err);
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  };

  const stopCamera = () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const playBeep = (count = 1, interval = 200) => {
    // Créer un contexte audio pour générer un bip
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const playSingleBeep = (index) => {
        if (index >= count) return;
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        osc.frequency.value = 800; // Fréquence du bip (Hz)
        osc.type = 'sine';
        
        const now = audioContext.currentTime;
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
        
        if (index < count - 1) {
          setTimeout(() => playSingleBeep(index + 1), interval);
        }
      };
      
      // Démarrer le premier bip
      playSingleBeep(0);
    } catch (err) {
      console.warn('Impossible de jouer le bip audio', err);
    }
  };

  const handleToken = async token => {
    lockRef.current = true;
    setStatus({ state: 'pending', token });
    try {
      const verification = await verifyQrToken(token, { 
        driverId, 
        controllerId: activeControllerId,
        location 
      });
      
      // Essayer de récupérer les données de l'étudiant, mais ne pas bloquer si ça échoue
      let student = verification.student || null;
      if (!student && verification.studentId) {
        try {
          student = await fetchStudentById(verification.studentId);
        } catch (fetchError) {
          console.warn('Impossible de récupérer les données de l\'étudiant:', fetchError);
          // Continuer sans les données complètes de l'étudiant
        }
      }

      // Jouer les bips selon le statut
      if (verification.status === SCAN_STATUS.APPROVED) {
        // 1 bip pour étudiant ayant payé
        playBeep(1);
      } else {
        // 3 bips successifs pour étudiant non payé ou problème
        playBeep(3, 150);
      }

      setStatus({ state: 'success', verification, student });
      appendHistory({
        status: verification.status,
        student,
        timestamp: new Date().toISOString(),
        reason: verification.reason,
      });

      // NE PAS ENREGISTRER un nouveau scan si c'est un doublon
      // Selon les spécifications : "NE PAS ENREGISTRER un nouveau scan" si scan récent existe
      if (verification.status !== SCAN_STATUS.DUPLICATE) {
        await safeLogAttempt({
          passId: verification.passId ?? null,
          studentId: verification.studentId ?? student?.id ?? null,
          studentName: student?.name ?? null, // Inclure le nom de l'étudiant dans les logs
          driverId,
          controllerId: activeControllerId,
          controllerName: activeControllerName,
          busLine: student?.busLine ?? verification.busLine ?? null,
          status: verification.status ?? SCAN_STATUS.ERROR,
          reason: verification.reason ?? null,
          location,
        });
      } else {
        console.log('⚠️ Scan doublon détecté - non enregistré dans la base de données');
      }
    } catch (err) {
      console.error('Token processing failed', err);
      // 3 bips pour erreur
      playBeep(3, 150);
      setStatus({ state: 'error', message: err.message });
      appendHistory({
        status: SCAN_STATUS.ERROR,
        student: null,
        timestamp: new Date().toISOString(),
        reason: err.message,
      });
      await safeLogAttempt({
        passId: null,
        studentId: null,
        driverId,
        controllerId: activeControllerId,
        controllerName: activeControllerName,
        busLine: null,
        status: SCAN_STATUS.ERROR,
        reason: err.message,
        location,
      });
    } finally {
      setTimeout(() => {
        lockRef.current = false;
        lastTokenRef.current = null;
      }, 1500);
    }
  };

  const appendHistory = entry => {
    setHistory(prev => {
      const newHistory = [entry, ...prev];
      // Filtrer les entrées de plus de 24 heures
      const now = Date.now();
      const retentionTime = HISTORY_RETENTION_HOURS * 60 * 60 * 1000; // 24 heures en millisecondes
      const filteredHistory = newHistory.filter(item => {
        const itemTime = new Date(item.timestamp).getTime();
        return (now - itemTime) < retentionTime;
      });
      // Limiter à DEFAULT_HISTORY_LIMIT si nécessaire
      return filteredHistory.slice(0, DEFAULT_HISTORY_LIMIT);
    });
  };

  // Nettoyer l'historique toutes les minutes pour supprimer les entrées de plus de 24h
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setHistory(prev => {
        const now = Date.now();
        const retentionTime = HISTORY_RETENTION_HOURS * 60 * 60 * 1000; // 24 heures en millisecondes
        return prev.filter(item => {
          const itemTime = new Date(item.timestamp).getTime();
          return (now - itemTime) < retentionTime;
        });
      });
    }, 60000); // Vérifier toutes les minutes

    return () => clearInterval(cleanupInterval);
  }, []);


  const handleManualSubmit = async event => {
    event.preventDefault();
    if (!manualToken.trim()) return;
    await handleToken(manualToken.trim());
    setManualToken('');
  };

  useEffect(() => () => stopCamera(), []);

  const statusNode = useMemo(() => renderStatus(status), [status]);

  return (
    <section className="driver-shell">
      <div className="card" style={{ padding: '1.5rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Scanner QR Chauffeur</h2>
            <p className="subtitle">Présentez le QR de l'étudiant devant la caméra pour valider l'accès.</p>
            {activeControllerName && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="chip chip--success" style={{ fontSize: '0.85rem' }}>
                  <UserCheck size={14} /> Connecté : {activeControllerName}
                </span>
              </div>
            )}
          </div>
          <div className="toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
            {active && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="button button--subtle" 
                  type="button" 
                  onClick={() => setFrameRotation(prev => Math.max(-45, prev - 5))}
                  title="Tourner le cadre vers la gauche"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  className="button button--subtle" 
                  type="button" 
                  onClick={() => setFrameRotation(0)}
                  title="Réinitialiser l'angle"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', minWidth: '50px' }}
                >
                  {frameRotation}°
                </button>
                <button 
                  className="button button--subtle" 
                  type="button" 
                  onClick={() => setFrameRotation(prev => Math.min(45, prev + 5))}
                  title="Tourner le cadre vers la droite"
                >
                  <RotateCw size={16} />
                </button>
              </div>
            )}
            {active ? (
              <button className="button button--danger" type="button" onClick={() => setActive(false)}>
                <StopCircle size={18} /> Arrêter
              </button>
            ) : (
              <button className="button" type="button" onClick={() => setActive(true)}>
                <PlayCircle size={18} /> Démarrer
              </button>
            )}
          </div>
        </header>

        {error ? (
          <div className="card" style={{ padding: '1rem', background: 'rgba(248, 113, 113, 0.16)', border: '1px solid rgba(220, 38, 38, 0.25)', marginBottom: '1rem' }}>
            <p className="subtitle" style={{ color: '#b91c1c', margin: 0 }}>
              <AlertTriangle size={16} style={{ marginRight: '0.4rem' }} /> {error}
            </p>
          </div>
        ) : null}

        <div className="layout-grid" style={{ gap: '1.25rem', alignItems: 'start' }}>
          <div className="scanner-frame" style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <video 
              ref={videoRef} 
              className="scanner-video" 
              playsInline 
              muted 
              autoPlay
              style={{ 
                transform: 'scaleX(-1) translateZ(0)',
                WebkitTransform: 'scaleX(-1) translateZ(0)',
                MozTransform: 'scaleX(-1)',
                OTransform: 'scaleX(-1)',
                msTransform: 'scaleX(-1)',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                willChange: 'auto',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
              }}
            />
            <canvas ref={canvasRef} className="scanner-canvas" />
            {!active ? (
              <div className="scanner-overlay">
                <Camera size={48} />
                <p>Appuyez sur "Démarrer" pour activer la caméra.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.8 }}>
                  Assurez-vous que la caméra est autorisée dans les paramètres de votre navigateur.
                </p>
              </div>
            ) : (
              <div className="scanner-guide">
                        {/* Indicateur de détection QR */}
                        {qrDetected && qrLocation && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${qrLocation.x * 100}%`,
                              top: `${qrLocation.y * 100}%`,
                              transform: 'translate(-50%, -50%)',
                              width: '60px',
                              height: '60px',
                              border: '3px solid rgba(34, 197, 94, 0.9)',
                              borderRadius: '50%',
                              background: 'rgba(34, 197, 94, 0.2)',
                              pointerEvents: 'none',
                              zIndex: 10,
                              animation: 'qrDetectedPulse 1s ease-in-out infinite',
                              boxShadow: '0 0 20px rgba(34, 197, 94, 0.6)',
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '20px',
                                height: '20px',
                                background: 'rgba(34, 197, 94, 1)',
                                borderRadius: '50%',
                              }}
                            />
                          </div>
                        )}
                        <div 
                          className="scanner-guide__frame"
                          style={{
                            transform: `rotate(${frameRotation}deg)`,
                            WebkitTransform: `rotate(${frameRotation}deg)`,
                            transition: 'transform 0.2s ease-out',
                            borderColor: qrDetected ? 'rgba(34, 197, 94, 1)' : 'rgba(34, 197, 94, 0.9)',
                            boxShadow: qrDetected 
                              ? '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 40px rgba(34, 197, 94, 1), inset 0 0 30px rgba(34, 197, 94, 0.4)'
                              : '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 30px rgba(34, 197, 94, 0.8), inset 0 0 20px rgba(34, 197, 94, 0.3)',
                          }}
                        >
                  {/* Coins de guidage supplémentaires */}
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '-4px',
                    width: '30px',
                    height: '30px',
                    borderTop: '4px solid rgba(34, 197, 94, 1)',
                    borderLeft: '4px solid rgba(34, 197, 94, 1)',
                    borderTopLeftRadius: '12px'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '30px',
                    height: '30px',
                    borderTop: '4px solid rgba(34, 197, 94, 1)',
                    borderRight: '4px solid rgba(34, 197, 94, 1)',
                    borderTopRightRadius: '12px'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    left: '-4px',
                    width: '30px',
                    height: '30px',
                    borderBottom: '4px solid rgba(34, 197, 94, 1)',
                    borderLeft: '4px solid rgba(34, 197, 94, 1)',
                    borderBottomLeftRadius: '12px'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '30px',
                    height: '30px',
                    borderBottom: '4px solid rgba(34, 197, 94, 1)',
                    borderRight: '4px solid rgba(34, 197, 94, 1)',
                    borderBottomRightRadius: '12px'
                  }}></div>
                </div>
                <p className="scanner-guide__text">Positionnez le QR code dans le cadre</p>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: 0 }}>Dernière vérification</h3>
            {statusNode}

            <form className="layout-grid" style={{ gap: '0.5rem' }} onSubmit={handleManualSubmit}>
              <label className="layout-grid" style={{ gap: '0.35rem' }}>
                <span style={{ fontWeight: 600 }}>Saisie manuelle (secours)</span>
                <input
                  className="input-field"
                  type="text"
                  value={manualToken}
                  placeholder="Coller le code QR"
                  onChange={event => setManualToken(event.target.value)}
                />
              </label>
              <button className="button button--subtle" type="submit" disabled={!manualToken.trim()}>
                Vérifier
              </button>
            </form>

            <div>
              <h4 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.4rem' }}>
                Historique récent (24h)
                {history.length > 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b', marginLeft: '0.5rem' }}>
                    ({history.length} entrée{history.length > 1 ? 's' : ''})
                  </span>
                )}
              </h4>
              <ul className="scan-history">
                {history.length === 0 ? (
                  <li className="scan-history__item scan-history__item--empty">
                    <Clock size={16} /> Aucun scan pour le moment
                  </li>
                ) : (
                  history.map((item, index) => (
                    <li key={`${item.timestamp}-${index}`} className="scan-history__item">
                      <span className="scan-history__status" style={{ color: STATUS_COLORS[item.status] || '#334155' }}>
                        ● {statusLabel(item.status)}
                      </span>
                      <span className="scan-history__name">{item.student?.name || 'Étudiant inconnu'}</span>
                      <span className="scan-history__time">
                        {new Date(item.timestamp).toLocaleString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {item.reason ? <span className="scan-history__reason">{item.reason}</span> : null}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function renderStatus(status) {
  if (!status) {
    return (
      <div className="scanner-status scanner-status--idle">
        <ShieldAlert size={20} />
        <div>
          <p>Aucun scan actif</p>
          <span className="subtitle">Présentez un QR pour voir les résultats ici.</span>
        </div>
      </div>
    );
  }

  if (status.state === 'pending') {
    return (
      <div className="scanner-status scanner-status--pending">
        <Clock size={20} />
        <div>
          <p>Vérification en cours...</p>
          <span className="subtitle">Analyse du QR code et vérification des droits.</span>
        </div>
      </div>
    );
  }

  if (status.state === 'error') {
    const errorMessage = status.message || 'Erreur inconnue';
    const isNetworkError = errorMessage.includes('connexion') || errorMessage.includes('network') || errorMessage.includes('timeout');
    
    return (
      <div className="scanner-status scanner-status--error" style={{ 
        borderColor: '#dc2626', 
        background: 'rgba(220, 38, 38, 0.1)', 
        padding: '1rem', 
        borderRadius: '8px' 
      }}>
        <AlertTriangle size={24} color="#dc2626" style={{ marginBottom: '0.5rem' }} />
        <div style={{ width: '100%' }}>
          <p style={{ color: '#dc2626', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            ❌ ERREUR DE VÉRIFICATION
          </p>
          <p className="subtitle" style={{ color: '#dc2626', marginBottom: '0.5rem' }}>
            {errorMessage}
          </p>
          {isNetworkError && (
            <p className="subtitle" style={{ fontSize: '0.85rem', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
              <strong>Conseil:</strong> Vérifiez votre connexion internet et réessayez.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status.state === 'success') {
    const { verification, student } = status;
    const isAuthorized = verification.status === SCAN_STATUS.APPROVED;
    const isExpired = verification.status === SCAN_STATUS.EXPIRED;
    const color = STATUS_COLORS[verification.status] || '#0f172a';
    
    // Calculer le statut d'abonnement détaillé
    const subscriptionStatus = student ? computeSubscriptionStatus(student) : null;
    
    // Si expiré, utiliser un fond rouge plus prononcé pour bien indiquer "pas d'accès"
    const bgColor = isExpired 
      ? 'rgba(220, 38, 38, 0.15)' 
      : isAuthorized 
        ? 'rgba(22, 163, 74, 0.1)' 
        : 'rgba(220, 38, 38, 0.1)';
    
    return (
      <div className="scanner-status" style={{ borderColor: color, background: bgColor, padding: '1rem', borderRadius: '8px' }}>
        {isAuthorized ? (
          <CheckCircle2 size={24} color={color} style={{ marginBottom: '0.5rem' }} />
        ) : (
          <AlertTriangle size={24} color={color} style={{ marginBottom: '0.5rem' }} />
        )}
        <div style={{ width: '100%' }}>
          <p style={{ color, fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {isAuthorized ? '✅ ÉTUDIANT AUTORISÉ' : '❌ ÉTUDIANT NON AUTORISÉ'}
          </p>
          
          {/* Afficher le statut d'abonnement selon les spécifications */}
          {subscriptionStatus && (
            <div style={{ 
              marginBottom: '0.75rem', 
              padding: '0.5rem', 
              background: subscriptionStatus.status === 'ACTIF' 
                ? 'rgba(22, 163, 74, 0.1)' 
                : subscriptionStatus.status === 'EN RETARD'
                  ? 'rgba(251, 191, 36, 0.1)'
                  : 'rgba(220, 38, 38, 0.1)',
              borderRadius: '4px',
              border: `1px solid ${
                subscriptionStatus.status === 'ACTIF' 
                  ? 'rgba(22, 163, 74, 0.3)' 
                  : subscriptionStatus.status === 'EN RETARD'
                    ? 'rgba(251, 191, 36, 0.3)'
                    : 'rgba(220, 38, 38, 0.3)'
              }`
            }}>
              <p style={{ 
                fontSize: '0.9rem', 
                fontWeight: 'bold', 
                margin: 0,
                color: subscriptionStatus.status === 'ACTIF' 
                  ? '#16a34a' 
                  : subscriptionStatus.status === 'EN RETARD'
                    ? '#d97706'
                    : '#dc2626'
              }}>
                Statut abonnement : {subscriptionStatus.status}
                {subscriptionStatus.status === 'EN RETARD' && subscriptionStatus.daysRemaining > 0 && (
                  <span style={{ fontSize: '0.85rem', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                    ({subscriptionStatus.daysRemaining} jour{subscriptionStatus.daysRemaining > 1 ? 's' : ''} restant{subscriptionStatus.daysRemaining > 1 ? 's' : ''})
                  </span>
                )}
              </p>
              {subscriptionStatus.message && (
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0, color: '#64748b' }}>
                  {subscriptionStatus.message}
                </p>
              )}
            </div>
          )}
          
          <p style={{ color, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            {statusLabel(verification.status)}
          </p>
          {student?.name && (
            <p className="subtitle" style={{ marginBottom: '0.25rem' }}>
              <strong>Nom:</strong> {student.name}
            </p>
          )}
          {student?.niveau && (
            <p className="subtitle" style={{ marginBottom: '0.25rem' }}>
              <strong>Niveau:</strong> {student.niveau}
            </p>
          )}
          {student?.busLine && (
            <p className="subtitle" style={{ marginBottom: '0.25rem' }}>
              <strong>Ligne:</strong> {student.busLine}
            </p>
          )}
          {/* Afficher l'alerte de fraude si détectée (mais accès autorisé) */}
          {verification.fraudWarning && verification.status === SCAN_STATUS.APPROVED && (
            <div style={{ 
              marginTop: '0.75rem', 
              padding: '0.75rem', 
              background: 'rgba(251, 191, 36, 0.2)', 
              border: '2px solid rgba(251, 191, 36, 0.6)',
              borderRadius: '6px'
            }}>
              <p style={{ color: '#d97706', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                ⚠️ ATTENTION - VÉRIFICATION REQUISE
              </p>
              <p style={{ fontSize: '0.9rem', color: '#92400e', margin: 0 }}>
                {verification.fraudWarning}
              </p>
            </div>
          )}
          
          {verification.reason && !verification.fraudWarning && (
            <p className="subtitle" style={{ color, fontStyle: 'italic', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}>
              <strong>Raison:</strong> {verification.reason}
            </p>
          )}
          
          {/* Afficher les informations du scan précédent si c'est un doublon */}
          {verification.status === SCAN_STATUS.DUPLICATE && verification.previousScan && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: 'rgba(249, 115, 22, 0.15)', 
              border: '1px solid rgba(249, 115, 22, 0.4)',
              borderRadius: '6px'
            }}>
              <p style={{ color: '#f97316', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                ⚠️ Code déjà scanné
              </p>
              <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                {verification.previousScan.controllerName && (
                  <p style={{ marginBottom: '0.25rem' }}>
                    <strong>Contrôlé par :</strong> {verification.previousScan.controllerName}
                  </p>
                )}
                {verification.previousScan.scannedAtFormatted && (
                  <p style={{ marginBottom: '0.25rem' }}>
                    <strong>Date :</strong> {verification.previousScan.scannedAtFormatted.split(',')[0]}
                  </p>
                )}
                {verification.previousScan.scannedAtFormatted && (
                  <p style={{ marginBottom: '0.25rem' }}>
                    <strong>Heure :</strong> {verification.previousScan.scannedAtFormatted.split(',')[1]?.trim() || verification.previousScan.scannedAtFormatted}
                  </p>
                )}
                {verification.previousScan.minutesAgo !== undefined && (
                  <p style={{ marginBottom: '0.25rem' }}>
                    <strong>Il y a :</strong> {
                      verification.previousScan.hoursAgo && verification.previousScan.hoursAgo > 0
                        ? `${verification.previousScan.hoursAgo} heure${verification.previousScan.hoursAgo > 1 ? 's' : ''} et ${verification.previousScan.remainingMinutes || 0} minute${(verification.previousScan.remainingMinutes || 0) > 1 ? 's' : ''}`
                        : `${verification.previousScan.minutesAgo} minute${verification.previousScan.minutesAgo > 1 ? 's' : ''}`
                    }
                  </p>
                )}
                {verification.previousScan.status && (
                  <p style={{ marginBottom: '0.25rem' }}>
                    <strong>Statut :</strong> {
                      verification.previousScan.status === 'approved' 
                        ? '✅ Actif' 
                        : verification.previousScan.status === 'expired'
                          ? '❌ Expiré'
                          : '⚠️ En retard'
                    }
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Afficher la date d'expiration */}
          {verification.expiresAt && (
            <div style={{ 
              marginTop: '0.75rem', 
              padding: '0.5rem', 
              background: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <p style={{ margin: 0, color: '#2563eb' }}>
                <strong>📅 Date d'expiration:</strong> {new Date(verification.expiresAt).toLocaleDateString('fr-FR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

async function safeLogAttempt(payload) {
  try {
    await logScanAttempt(payload);
  } catch (err) {
    console.warn('Unable to log scan attempt', err);
  }
}

function statusLabel(status) {
  switch (status) {
    case SCAN_STATUS.APPROVED:
      return 'Accès validé';
    case SCAN_STATUS.DUPLICATE:
      return 'Déjà scanné';
    case SCAN_STATUS.EXPIRED:
      return '❌ ACCÈS REFUSÉ - Abonnement fini, pas d\'accès';
    case SCAN_STATUS.FRAUD:
      return 'Suspicion de fraude';
    case SCAN_STATUS.ERROR:
    default:
      return 'Erreur';
  }
}

