import React from 'react'
import { createRoot } from 'react-dom/client'
import AppNew from './AppNew.jsx'
import './styles.css'

// Vérifier que le root existe
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Element #root introuvable dans le DOM');
} else {
  try {
    const root = createRoot(rootElement);
    root.render(<AppNew />);
    console.log('Application React démarrée avec succès');
  } catch (error) {
    console.error('Erreur lors du rendu de l\'application:', error);
  }
}

// Service Worker (optionnel)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      // Écouter les messages du Service Worker pour forcer le rechargement
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'FORCE_RELOAD') {
          // Désinscrire le Service Worker et recharger
          registration.unregister().then(() => {
            window.location.reload(true);
          });
        }
      });
      
      // Vérifier s'il y a une mise à jour disponible
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // Nouveau Service Worker activé, recharger
              window.location.reload(true);
            }
          });
        }
      });
    }).catch(() => {
      // Service Worker optionnel, on ignore les erreurs
    });
    
    // Vérifier périodiquement les mises à jour
    setInterval(() => {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.update();
        }
      });
    }, 60000); // Toutes les minutes
  });
}