import React, { useState, useEffect } from 'react';
import DriverScanner from './DriverScanner.jsx';
import { Shield, Smartphone, Wifi, LogIn, LogOut, User } from 'lucide-react';
import { subscribeControllers, fetchControllerById } from '../services/firestoreService';

export default function DriverScreen() {
  const [controllers, setControllers] = useState([]);
  const [selectedControllerId, setSelectedControllerId] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [authenticatedController, setAuthenticatedController] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // S'abonner aux contrôleurs actifs
  useEffect(() => {
    const unsubscribe = subscribeControllers((controllersList) => {
      setControllers(controllersList.filter(c => c.active !== false));
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Charger le contrôleur authentifié depuis le localStorage
  useEffect(() => {
    const savedControllerId = localStorage.getItem('authenticatedControllerId');
    if (savedControllerId) {
      fetchControllerById(savedControllerId).then(controller => {
        if (controller && controller.active !== false) {
          setAuthenticatedController(controller);
          setSelectedControllerId(controller.id);
        } else {
          localStorage.removeItem('authenticatedControllerId');
        }
      }).catch(() => {
        localStorage.removeItem('authenticatedControllerId');
      });
    }
  }, []);

  const handleControllerSelect = (controllerId) => {
    setSelectedControllerId(controllerId);
    setShowLoginModal(true);
    setLoginPassword('');
    setLoginError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);

    if (!selectedControllerId) {
      setLoginError('Veuillez sélectionner un contrôleur');
      return;
    }

    const controller = controllers.find(c => c.id === selectedControllerId);
    if (!controller) {
      setLoginError('Contrôleur introuvable');
      return;
    }

    // Vérifier le mot de passe
    if (loginPassword.trim() === controller.password) {
      setAuthenticatedController(controller);
      setSelectedControllerId(controller.id);
      setShowLoginModal(false);
      setLoginPassword('');
      // Sauvegarder dans localStorage
      localStorage.setItem('authenticatedControllerId', controller.id);
    } else {
      setLoginError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setAuthenticatedController(null);
    setSelectedControllerId(null);
    setLoginPassword('');
    localStorage.removeItem('authenticatedControllerId');
  };

  return (
    <div className="app-shell" style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '1.75rem 2rem', marginBottom: '1.5rem' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="badge badge--success" style={{ padding: '0.6rem', borderRadius: '14px' }}>
              <Shield size={28} />
            </div>
            <div>
              <h1 className="section-title" style={{ margin: 0 }}>Espace Chauffeur</h1>
              <p className="subtitle">
                {authenticatedController 
                  ? `Connecté en tant que : ${authenticatedController.name}`
                  : 'Sélectionnez votre profil et entrez votre mot de passe pour scanner'}
              </p>
            </div>
          </div>
          {authenticatedController ? (
            <button
              className="button button--subtle"
              type="button"
              onClick={handleLogout}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <LogOut size={16} /> Déconnexion
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {controllers.length > 0 && (
                <select
                  className="form-input"
                  value={selectedControllerId || ''}
                  onChange={(e) => handleControllerSelect(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', minWidth: '200px' }}
                >
                  <option value="">Sélectionner un contrôleur</option>
                  {controllers.map(controller => (
                    <option key={controller.id} value={controller.id}>
                      {controller.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </header>

        <div className="layout-grid" style={{ gap: '1rem', marginTop: '1.25rem' }}>
          <Hint icon={Smartphone} title="Utilisez la caméra arrière">
            Tenez le téléphone à environ 30 cm, dans un environnement lumineux, et centrez le QR dans le cadre.
          </Hint>
          <Hint icon={Shield} title="Sécurité intégrée">
            Chaque scan est journalisé. En cas de QR expiré ou suspect, une alerte visuelle s’affiche immédiatement.
          </Hint>
          <Hint icon={Wifi} title="Fonctionnement hors ligne">
            La vérification fonctionne même sans réseau : l’application valide les données stockées et synchronisera plus tard.
          </Hint>
        </div>
      </div>

      {!authenticatedController && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <User size={24} color="#64748b" />
            <div>
              <h3 className="section-title" style={{ margin: 0, fontSize: '1rem' }}>Connexion contrôleur</h3>
              <p className="subtitle" style={{ margin: 0, fontSize: '0.85rem' }}>
                Sélectionnez votre profil et entrez le mot de passe fourni par l'éducatrice
              </p>
            </div>
          </div>
          {controllers.length === 0 ? (
            <p className="subtitle" style={{ color: '#64748b', margin: 0 }}>
              Aucun contrôleur disponible. Contactez l'éducatrice pour créer votre compte.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-input"
                value={selectedControllerId || ''}
                onChange={(e) => handleControllerSelect(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', minWidth: '200px', flex: 1 }}
              >
                <option value="">Sélectionner votre profil</option>
                {controllers.map(controller => (
                  <option key={controller.id} value={controller.id}>
                    {controller.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {showLoginModal && selectedControllerId && (
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
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <h3 className="section-title" style={{ marginBottom: '1rem' }}>
              Connexion - {controllers.find(c => c.id === selectedControllerId)?.name}
            </h3>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Mot de passe</label>
                <input
                  type="password"
                  className="form-input"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Entrez le mot de passe fourni par l'éducatrice"
                  autoFocus
                />
                {loginError && (
                  <span className="form-error" style={{ display: 'block', marginTop: '0.5rem' }}>
                    {loginError}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="button button--subtle"
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginPassword('');
                    setLoginError(null);
                    setSelectedControllerId(null);
                  }}
                >
                  Annuler
                </button>
                <button type="submit" className="button">
                  <LogIn size={16} /> Se connecter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {authenticatedController ? (
        <DriverScanner controllerId={authenticatedController.id} controllerName={authenticatedController.name} />
      ) : (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p className="subtitle">Veuillez vous connecter avec votre profil contrôleur pour accéder au scanner</p>
        </div>
      )}
    </div>
  );
}

function Hint({ icon: Icon, title, children }) {
  return (
    <div className="card" style={{ padding: '1rem 1.1rem', display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
      <div className="badge badge--success" style={{ borderRadius: '12px' }}>
        <Icon size={18} />
      </div>
      <div>
        <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>{title}</h3>
        <p className="subtitle" style={{ margin: 0 }}>{children}</p>
      </div>
    </div>
  );
}

