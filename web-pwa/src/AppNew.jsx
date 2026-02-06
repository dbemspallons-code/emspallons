import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ControllerScan from './components/ControllerScan';
import { triggerSync, getOutboxLength } from './services/offlineService';
import { getCurrentUser, logout } from './services/authService';

export default function AppNew() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(typeof window !== 'undefined' ? window.location.pathname : '/');
  const [queuedCount, setQueuedCount] = useState(0);
  const [showQueuedToast, setShowQueuedToast] = useState(false);

  useEffect(() => {
    checkAuth();
    function handlePopState() {
      setPath(window.location.pathname);
    }
    // Trigger a sync attempt on app load (if any queued items)
    if ('serviceWorker' in navigator) {
      triggerSync().catch(() => {});
    }

    // Initial outbox length for global badge
    (async () => {
      try {
        const len = await getOutboxLength();
        if (typeof len === 'number' && len > 0) setQueuedCount(len);
      } catch (e) {
        // ignore
      }
    })();

    // Listen to SW messages to update global badge
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
      window.addEventListener('popstate', handlePopState);
      return () => {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        window.removeEventListener('popstate', handlePopState);
      };
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSuccess() {
    await checkAuth();
  }

  async function handleLogout() {
    await logout();
    setUser(null);
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

  // Global queued badge
  const GlobalQueuedBadge = () => (
    <div className="fixed top-4 right-4 z-50">
      {queuedCount > 0 && (
        <button
          className="ui-pill inline-flex items-center gap-2 bg-yellow-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-yellow-600"
          onClick={() => {
            triggerSync();
            setShowQueuedToast(true);
            setTimeout(() => setShowQueuedToast(false), 3000);
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10v6a2 2 0 0 1-2 2H7" />
            <path d="M3 6v6a2 2 0 0 0 2 2h12" />
          </svg>
          <span className="font-semibold">{queuedCount}</span>
        </button>
      )}

      {showQueuedToast && (
        <div className="ui-toast mt-2 bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg">🔁 Synchronisation demandée</div>
      )}
    </div>
  );

  // Routes publiques pour les contrôleurs (sans authentification)
  if (path.startsWith('/chauffeur') || path.startsWith('/controller/scan') || path.startsWith('/verify-driver')) {
    return <ControllerScan />;
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

