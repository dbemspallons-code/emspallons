import React, { useState, useEffect } from 'react';
import { X, Save, Settings, DollarSign, Bell } from 'lucide-react';
import { getSettings, updateSettings } from '../services/settingsService';

export default function SettingsModal({ isOpen, onClose, isAdmin, onReset, showResetConfirm }) {
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState(12500);
  const [alertThreshold, setAlertThreshold] = useState(15);
  const [controllerAccessCode, setControllerAccessCode] = useState('1234-5678-9012');
  const [controllerName, setControllerName] = useState('Contrôleur');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  async function loadSettings() {
    try {
      const settings = await getSettings();
      setDefaultMonthlyFee(settings.defaultMonthlyFee || 12500);
      setAlertThreshold(settings.alertThreshold || 15);
      setControllerAccessCode(settings.controllerAccessCode || '1234-5678-9012');
      setControllerName(settings.controllerName || 'Contrôleur');
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!isAdmin) {
      setError('Seuls les administrateurs peuvent modifier les paramètres');
      return;
    }

    if (defaultMonthlyFee <= 0) {
      setError('Le montant mensuel doit être supérieur à 0');
      return;
    }

    if (alertThreshold < 0) {
      setError('Le seuil d\'alerte doit être positif');
      return;
    }

    if (!controllerAccessCode || controllerAccessCode.length < 8) {
      setError('Le code contrôleur doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);

    try {
      await updateSettings({
        defaultMonthlyFee: Number(defaultMonthlyFee),
        alertThreshold: Number(alertThreshold),
        controllerAccessCode,
        controllerName,
      });
      setMessage('Paramètres enregistrés avec succès');
      setTimeout(() => {
        setMessage('');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto modal-enter">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-semibold">Paramètres</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              {message}
            </div>
          )}

          {!isAdmin && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
              Vous n'avez pas les droits pour modifier les paramètres.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Montant mensuel par défaut (FCFA) <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="number"
              value={defaultMonthlyFee}
              onChange={(e) => setDefaultMonthlyFee(Number(e.target.value))}
              required
              min="0"
              step="100"
              disabled={!isAdmin}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="12500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ce montant sera utilisé par défaut pour calculer le montant total lors de l'enregistrement d'un paiement.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Seuil d'alerte (jours) <span className="text-red-500">*</span>
              </div>
            </label>
            <input
              type="number"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              required
              min="0"
              disabled={!isAdmin}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="15"
            />
            <p className="mt-1 text-xs text-gray-500">
              Nombre de jours avant expiration pour afficher une alerte (ex: 15 jours).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code accès contrôleur (chauffeur)
            </label>
            <input
              type="text"
              value={controllerAccessCode}
              onChange={(e) => setControllerAccessCode(e.target.value.toUpperCase())}
              required
              disabled={!isAdmin}
              className="w-full px-4 py-2 uppercase border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed tracking-widest"
              placeholder="1234-5678-9012"
            />
            <p className="mt-1 text-xs text-gray-500">
              Code à transmettre aux contrôleurs pour accéder à l'interface de scan (/chauffeur).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom par défaut du contrôleur (affiché sur les logs)
            </label>
            <input
              type="text"
              value={controllerName}
              onChange={(e) => setControllerName(e.target.value)}
              required
              disabled={!isAdmin}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Contrôleur"
            />
          </div>

          {isAdmin && onReset && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-700">Zone sensible</h3>
              <p className="text-xs text-red-700 mt-1">
                Cette action supprime tous les etudiants et paiements. Les utilisateurs ne seront pas supprimes.
              </p>
              <button
                type="button"
                onClick={onReset}
                className="mt-3 px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-100 transition"
              >
                {showResetConfirm ? 'Confirmer la reinitialisation' : 'Reinitialiser les donnees'}
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Annuler
            </button>
            {isAdmin && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4 inline mr-2" />
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
