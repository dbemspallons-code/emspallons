import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, DollarSign, Calendar, HelpCircle, CalendarDays } from 'lucide-react';
import HelpTooltip from './HelpTooltip';
import { getDefaultMonthlyFee } from '../services/settingsService';
import { calculatePaymentPlan, formatCurrency } from '../utils/payment';
import { MONTH_NAMES } from '../constants/payment';
import { PAYMENT_CONFIG } from '../constants/payment';

const MONTHS_OPTIONS = [1, 2, 3, 5, 6, 12];

export default function PaymentFormModal({ student, onClose, onSave }) {
  const [nombreMois, setNombreMois] = useState(1);
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState(PAYMENT_CONFIG.DEFAULT_MONTHLY_FEE);
  const [customMonthlyFee, setCustomMonthlyFee] = useState('');
  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [dateEnregistrement, setDateEnregistrement] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Charger le montant mensuel par défaut
  useEffect(() => {
    async function loadDefaultFee() {
      const defaultFee = await getDefaultMonthlyFee();
      setDefaultMonthlyFee(defaultFee);
    }
    loadDefaultFee();
  }, []);

  const plan = useMemo(() => {
    try {
      const fee = customMonthlyFee ? Number(customMonthlyFee) : defaultMonthlyFee;
      return calculatePaymentPlan(startMonth, nombreMois, fee);
    } catch (error) {
      return null;
    }
  }, [startMonth, nombreMois, customMonthlyFee, defaultMonthlyFee]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!plan) {
      setError('Impossible de calculer le plan de paiement. Vérifiez les informations.');
      return;
    }

    if (!nombreMois || !MONTHS_OPTIONS.includes(Number(nombreMois))) {
      setError('Nombre de mois invalide');
      return;
    }

    if (!plan.monthlyFee || Number(plan.monthlyFee) <= 0) {
      setError('Le montant mensuel doit être supérieur à 0');
      return;
    }

    setLoading(true);

    try {
      await onSave({
        studentId: student.id,
        plan,
        dateEnregistrement: new Date(dateEnregistrement).toISOString(),
        description,
      });
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Nouveau paiement</h2>
            <p className="text-sm text-gray-500 mt-1">
              {student.nom} {student.prenom}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Mois de départ <span className="text-red-500">*</span>
                <HelpTooltip text="Sélectionnez le premier mois couvert par ce paiement." />
              </div>
            </label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(Number(e.target.value))}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                Nombre de mois <span className="text-red-500">*</span>
                <HelpTooltip text="Sélectionnez combien de mois sont couverts par ce paiement. Le montant total sera calculé automatiquement." />
              </div>
            </label>
            <select
              value={nombreMois}
              onChange={(e) => setNombreMois(Number(e.target.value))}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              {MONTHS_OPTIONS.map(months => (
                <option key={months} value={months}>
                  {months} {months === 1 ? 'mois' : 'mois'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                Montant mensuel (FCFA)
                <HelpTooltip text="Laissez vide pour utiliser le tarif par défaut défini par l'administrateur (12 500 FCFA par défaut)." />
              </div>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={customMonthlyFee}
                onChange={(e) => setCustomMonthlyFee(e.target.value)}
                min="0"
                step="100"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder={`${defaultMonthlyFee} (par défaut)`}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Tarif par défaut actuel : {formatCurrency(defaultMonthlyFee)} FCFA. Laisser vide pour l'utiliser.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Montant total calculé</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {plan ? `${formatCurrency(plan.totalAmount)} FCFA` : '—'}
            </div>
            <p className="text-sm text-blue-600 mt-1">
              {plan ? `${plan.numberOfMonths} mois × ${formatCurrency(plan.monthlyFee)} FCFA` : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de paiement <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateEnregistrement}
                onChange={(e) => setDateEnregistrement(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              L'abonnement commencera toujours le 1er du mois de paiement
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Notes additionnelles..."
            />
          </div>

          {/* Résumé */}
          <div className="bg-gradient-to-br from-yellow-50 to-green-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Résumé de l'abonnement</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Montant mensuel:</span>
                <span className="font-medium">
                  {plan ? `${formatCurrency(plan.monthlyFee)} FCFA` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Montant total:</span>
                <span className="font-medium">
                  {plan ? `${formatCurrency(plan.totalAmount)} FCFA` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Période:</span>
                <span className="font-medium text-right">
                  {plan
                    ? `Du ${plan.periodStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    au ${plan.periodEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Mois couverts :</span>
                <p className="font-medium text-gray-800 mt-1">
                  {plan ? plan.months.join(', ') : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4 inline mr-2" />
              {loading ? 'Enregistrement...' : 'Enregistrer le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

