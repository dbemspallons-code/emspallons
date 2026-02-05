import React, { useState, useEffect, useRef } from 'react';
import { LogIn, User, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { login, isFirstUser, getRecentUsers } from '../services/authService';
import FirstAdminSetup from './FirstAdminSetup';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirst, setIsFirst] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recentUsers, setRecentUsers] = useState([]);
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

  function handleSelectProfile(profile) {
    setEmail(profile.email);
    setPassword('');
    setTimeout(() => {
      passwordRef.current?.focus();
    }, 0);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-green-50">
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-green-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-green-500 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">EMSP Allons</h1>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-[0.35em]">Plateforme officielle</p>
            <p className="text-gray-600 mt-2">Gestion des abonnements transport scolaire</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
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
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/60'
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
              className="w-full bg-gradient-to-r from-yellow-400 to-green-500 text-white font-semibold py-3 rounded-lg hover:from-yellow-500 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/chauffeur';
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition border border-indigo-200"
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
    </div>
  );
}

