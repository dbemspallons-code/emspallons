import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Calendar, DollarSign, CreditCard } from 'lucide-react';
import { recordResubscription, fetchSubscriptionHistory } from '../services/subscriptionService';
import { fetchLines } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';

const DURATION_OPTIONS = [
  { value: 1, label: '1 mois' },
  { value: 3, label: '3 mois (Trimestre)' },
  { value: 6, label: '6 mois (Semestre)' },
  { value: 12, label: '12 mois (Année)' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Espèces' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'check', label: 'Chèque' },
  { value: 'other', label: 'Autre' },
];

export default function ResubscriptionModal({ student, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    durationMonths: 1,
    amount: 0,
    paymentMethod: 'cash',
    busLine: '',
    notes: '',
  });
  const [lines, setLines] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (student) {
      setFormData(prev => ({
        ...prev,
        busLine: student.busLine || '',
        amount: student.monthlyFee || 12500,
      }));
      loadLines();
      loadHistory();
    }
  }, [student]);

  const loadLines = async () => {
    try {
      const linesData = await fetchLines();
      setLines(linesData);
    } catch (error) {
      console.error('Erreur chargement lignes:', error);
    }
  };

  const loadHistory = async () => {
    if (!student?.id) return;
    try {
      const historyData = await fetchSubscriptionHistory(student.id);
      setHistory(historyData);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const calculateTotal = () => {
    return formData.amount * formData.durationMonths;
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.startDate) {
      newErrors.startDate = 'Date de début requise';
    }
    if (!formData.durationMonths || formData.durationMonths <= 0) {
      newErrors.durationMonths = 'Durée invalide';
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Montant invalide';
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Méthode de paiement requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const currentUser = await getCurrentUser().catch(() => null);
      
      const result = await recordResubscription({
        studentId: student.id,
        startDate: new Date(formData.startDate).toISOString(),
        durationMonths: formData.durationMonths,
        amount: calculateTotal(),
        paymentMethod: formData.paymentMethod,
        busLine: formData.busLine || student.busLine,
        previousBusLine: student.busLine,
        notes: formData.notes,
      }, {
        userId: currentUser?.uid || null,
        userName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Système',
      });

      if (onSuccess) {
        await onSuccess(result);
      }
      onClose();
    } catch (error) {
      setErrors({ submit: error.message || 'Erreur lors du réabonnement' });
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div className="card modal-enter" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--success" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <RefreshCw size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Réabonner l'étudiant</h2>
          </div>
          <button
            className="button button--subtle"
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem' }}
          >
            <X size={20} />
          </button>
        </header>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Étudiant: {student.name}</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
            Contact: {student.contact || 'N/A'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '8px',
              marginBottom: '1rem',
              color: '#dc2626',
              fontSize: '0.9rem'
            }}>
              {errors.submit}
            </div>
          )}

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <Calendar size={16} /> Date de début *
              </label>
              <input
                className="input-field"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
              {errors.startDate && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.startDate}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Durée de l'abonnement *
              </label>
              <select
                className="input-field"
                value={formData.durationMonths}
                onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value, 10) })}
                required
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.durationMonths && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.durationMonths}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <DollarSign size={16} /> Montant mensuel (FCFA) *
              </label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="100"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                required
              />
              {errors.amount && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.amount}</p>
              )}
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                Total: {calculateTotal().toLocaleString('fr-FR')} FCFA ({formData.durationMonths} mois)
              </p>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <CreditCard size={16} /> Méthode de paiement *
              </label>
              <select
                className="input-field"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                required
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
              {errors.paymentMethod && (
                <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.paymentMethod}</p>
              )}
            </div>

            {lines.length > 0 && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Ligne de bus (optionnel - pour changement)
                </label>
                <select
                  className="input-field"
                  value={formData.busLine}
                  onChange={(e) => setFormData({ ...formData, busLine: e.target.value })}
                >
                  <option value="">Conserver la ligne actuelle</option>
                  {lines.map(line => (
                    <option key={line.id} value={line.id}>{line.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Notes (optionnel)
              </label>
              <textarea
                className="input-field"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes sur ce réabonnement..."
              />
            </div>
          </div>

          {history.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Historique des abonnements</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflow: 'auto' }}>
                {history.slice(0, 5).map((item, idx) => (
                  <div key={idx} style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'white', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(item.startDate).toLocaleDateString('fr-FR')}</span>
                      <span style={{ fontWeight: 600 }}>{item.amount.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {item.durationMonths} mois - {PAYMENT_METHODS.find(m => m.value === item.paymentMethod)?.label || item.paymentMethod}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button className="button button--subtle" type="button" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button className="button" type="submit" disabled={loading}>
              <Save size={16} /> {loading ? 'Enregistrement...' : 'Réabonner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

