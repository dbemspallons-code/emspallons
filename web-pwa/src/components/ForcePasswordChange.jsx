import React, { useState } from 'react';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { forceUpdatePassword, logout } from '../services/authService';

export default function ForcePasswordChange({ user, onComplete, onLogout }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await forceUpdatePassword(password);
      setSuccess(true);
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 700);
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise a jour du mot de passe');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    if (onLogout) onLogout();
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="ui-card ui-card--auth p-8">
          <div className="text-center mb-6">
            <div className="brand-emblem inline-flex items-center justify-center w-16 h-16 mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 brand-title">Changement obligatoire</h1>
            <p className="text-gray-600">
              Votre compte a ete cree par un administrateur.
              Veuillez definir un nouveau mot de passe.
            </p>
            {user?.email && (
              <p className="text-xs text-gray-500 mt-2">Compte: {user.email}</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-700">Mot de passe mis a jour avec succes.</p>
                <button
                  type="button"
                  onClick={() => onComplete && onComplete()}
                  className="mt-3 ui-btn ui-btn--primary"
                >
                  Continuer
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="ui-btn ui-btn--primary w-full py-3 disabled:opacity-50"
              >
                {loading ? 'Mise a jour...' : 'Valider le mot de passe'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="ui-btn ui-btn--ghost w-full py-3"
              >
                Se deconnecter
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
