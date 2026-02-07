import React, { useState, useEffect, useRef } from 'react';
import { LogIn, User, Lock, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { login, isFirstUser, getRecentUsers, requestPasswordReset } from '../services/authService';
import FirstAdminSetup from './FirstAdminSetup';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirst, setIsFirst] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recentUsers, setRecentUsers] = useState([]);
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const passwordRef = useRef(null);

  useEffect(() => {
    checkFirstUser();
    loadRecentProfiles();
  }, []);

  async function checkFirstUser() {
    try {
      const first = await isFirstUser();
      setIsFirst(first);
    } catch (err) {
      console.error('Erreur vérification premier utilisateur:', err);
    } finally {
      setChecking(false);
    }
  }

  async function loadRecentProfiles() {
    try {
      const profiles = await getRecentUsers();
      setRecentUsers(profiles);
      if (profiles.length > 0 && !email) {
        setEmail(profiles[0].email);
      }
    } catch (err) {
      console.error('Erreur chargement profils récents:', err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(target) {
    const targetEmail = (target || email || '').trim();
    if (!targetEmail) {
      setResetError('Entrez votre email pour reinitialiser le mot de passe');
      return;
    }
    setResetError('');
    setResetSuccess('');
    setResetMessage('');
    setResetLoading(true);
    try {
      await requestPasswordReset(targetEmail);
      const okMsg = 'Email de reinitialisation envoye. Verifiez votre boite mail.';
      setResetMessage(okMsg);
      setResetSuccess(okMsg);
    } catch (err) {
      setResetError(err.message || 'Impossible d\'envoyer l\'email');
    } finally {
      setResetLoading(false);
    }
  }

  function handleSelectProfile(profile) {
    setEmail(profile.email);
    setPassword('');
    setTimeout(() => {
      passwordRef.current?.focus();
    }, 0);
  }

  if (checking) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (isFirst) {
    return <FirstAdminSetup onSetupSuccess={onLoginSuccess} />;
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="ui-card ui-card--auth p-8">
          <div className="text-center mb-8">
            <div className="brand-emblem inline-flex items-center justify-center w-16 h-16 mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 brand-title">EMSP Allons</h1>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-[0.35em]">Plateforme officielle</p>
            <p className="text-gray-600 mt-2">Gestion des abonnements transport scolaire</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {resetMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{resetMessage}</p>
            </div>
          )}

          {recentUsers.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Profils enregistrés</p>
              <div className="space-y-2">
                {recentUsers.map((profile) => {
                  const isSelected = profile.email === email;
                  return (
                    <button
                      key={profile.email}
                      type="button"
                      onClick={() => handleSelectProfile(profile)}
                      className={`ui-select w-full flex items-center justify-between px-4 py-3 ${
                        isSelected ? 'ui-select--active' : ''
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold">{profile.nom || profile.email}</p>
                        <p className="text-xs text-gray-500">{profile.email}</p>
                      </div>
                      <span className="text-xs uppercase font-semibold text-gray-500">
                        {profile.role === 'admin' ? 'Admin' : 'Éducateur'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  ref={passwordRef}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ui-btn ui-btn--primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setResetError('');
                setResetSuccess('');
                setShowResetModal(true);
              }}
              className="w-full text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline mt-2"
            >
              Mot de passe oublie ?
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/chauffeur';
              }}
              className="ui-btn ui-btn--ghost w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold"
            >
              <ShieldCheck className="w-5 h-5" />
              Accès Contrôleur / Chauffeur
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Pour scanner les QR codes des étudiants
            </p>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Reinitialiser le mot de passe</h2>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleForgotPassword(resetEmail);
              }}
              className="p-6 space-y-4"
            >
              {resetError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {resetError}
                </div>
              )}
              {resetSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  {resetSuccess}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="votre@email.com"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 disabled:opacity-50"
                >
                  {resetLoading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
