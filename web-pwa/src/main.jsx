import React from 'react';
import { createRoot } from 'react-dom/client';
import AppNew from './AppNew.jsx';
import { supabaseInitError } from './supabase/supabaseClient.js';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Élément #root introuvable dans le DOM');
} else {
  const root = createRoot(rootElement);
  if (supabaseInitError) {
    root.render(
      <div className="min-h-screen app-bg flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 border border-red-200">
          <h1 className="text-xl font-semibold text-red-700 mb-3">Configuration Supabase manquante</h1>
          <p className="text-sm text-gray-700 whitespace-pre-line">{supabaseInitError}</p>
          <div className="mt-4 text-xs text-gray-500">
            Astuce: après correction sur Netlify, relance un déploiement.
          </div>
        </div>
      </div>
    );
  } else {
    try {
      root.render(<AppNew />);
      console.log('Application React démarrée avec succès');
    } catch (error) {
      console.error("Erreur lors du rendu de l'application:", error);
    }
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
