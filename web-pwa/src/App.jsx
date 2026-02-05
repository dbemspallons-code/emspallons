import React, { useState, useEffect } from 'react';
import BusManagementSystem from './components/BusManagementSystem.jsx';
import DriverScreen from './components/DriverScreen.jsx';
import AuthGuard from './components/AuthGuard.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import AnimatedBackground from './components/AnimatedBackground.jsx';

const ROLES = [
  { id: 'educator', label: 'Éducatrices' },
  { id: 'driver', label: 'Chauffeur' },
];

export default function App() {
  const [role, setRole] = useState(() => {
    if (typeof window === 'undefined') return 'driver';
    // Forcer le mode chauffeur par défaut si pas de rôle sauvegardé
    const savedRole = window.localStorage.getItem('bus_app_role');
    return savedRole || 'driver';
  });

  const switchRole = nextRole => {
    // Si on passe en mode éducatrice, on change le rôle
    // AuthGuard s'affichera automatiquement et demandera l'authentification si nécessaire
    setRole(nextRole);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bus_app_role', nextRole);
    }
  };

  // Permettre l'accès au profil chauffeur sans authentification
  // L'authentification est requise UNIQUEMENT pour le mode éducatrice
  const isDriverMode = role === 'driver';
  
  // Forcer le mode chauffeur si le rôle n'est pas défini
  useEffect(() => {
    if (typeof window !== 'undefined' && !role) {
      setRole('driver');
      window.localStorage.setItem('bus_app_role', 'driver');
    }
  }, [role]);
  
  return (
    <ErrorBoundary>
      <AnimatedBackground />
      {isDriverMode ? (
        // Mode chauffeur : pas d'authentification requise
        <div style={{ position: 'relative', zIndex: 1 }}>
          <nav className="app-nav">
            <div className="app-nav__brand">
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img 
                  src="/images/logos/emsp-allons-logo.png" 
                  alt="EMSP Allons!"
                  className="app-nav__logo"
                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                  onError={(e) => {
                    try {
                      e.target.style.display = 'none';
                    } catch (err) {
                      console.warn('Erreur chargement logo navigation:', err);
                    }
                  }}
                  onLoad={(e) => {
                    // Image chargée avec succès
                    e.target.style.display = 'block';
                  }}
                />
                <span>EMSP</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e' }}>Allons!</span>
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.1rem' }}>
                Ecole Multinationale Supérieure des Postes d'Abidjan
              </div>
            </div>
            <div className="app-nav__roles">
              {ROLES.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`app-nav__btn ${role === option.id ? 'app-nav__btn--active' : ''}`}
                  onClick={() => switchRole(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </nav>

          <ErrorBoundary>
            <DriverScreen />
          </ErrorBoundary>
        </div>
      ) : (
        // Mode éducatrice : authentification requise
        <AuthGuard>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <nav className="app-nav">
              <div className="app-nav__brand">
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img 
                    src="/images/logos/emsp-allons-logo.png" 
                    alt="EMSP Allons!"
                    className="app-nav__logo"
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                    onError={(e) => {
                      try {
                        e.target.style.display = 'none';
                      } catch (err) {
                        console.warn('Erreur chargement logo navigation:', err);
                      }
                    }}
                    onLoad={(e) => {
                      // Image chargée avec succès
                      e.target.style.display = 'block';
                    }}
                  />
                  <span>EMSP</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e' }}>Allons!</span>
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.1rem' }}>
                  Ecole Multinationale Supérieure des Postes d'Abidjan
                </div>
              </div>
              <div className="app-nav__roles">
                {ROLES.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className={`app-nav__btn ${role === option.id ? 'app-nav__btn--active' : ''}`}
                    onClick={() => switchRole(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </nav>

            <ErrorBoundary>
              <BusManagementSystem />
            </ErrorBoundary>
          </div>
        </AuthGuard>
      )}
    </ErrorBoundary>
  );
}