import React, { useEffect, useState } from 'react';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';
import { completePasswordReset } from '../services/authService';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle'); // idle | ready | done | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.getSessionFromUrl({ storeSession: true });
        setStatus('ready');
      } catch (err) {
        setStatus('error');
        setMessage('Lien invalide ou expire.');
      }
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    if (password.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setMessage('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      await completePasswordReset(password);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Erreur lors de la reinitialisation');
    }
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="ui-card ui-card--auth p-8">
          <div className="text-center mb-6">
            <div className="brand-emblem inline-flex items-center justify-center w-16 h-16 mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 brand-title">Nouveau mot de passe</h1>
            <p className="text-gray-600">Choisissez un nouveau mot de passe</p>
          </div>

          {message && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{message}</p>
            </div>
          )}

          {status === 'done' ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-700">Mot de passe mis a jour avec succes.</p>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/'; }}
                  className="mt-3 ui-btn ui-btn--primary"
                >
                  Retour a la connexion
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
              <button type="submit" className="ui-btn ui-btn--primary w-full py-3">
                Enregistrer
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

