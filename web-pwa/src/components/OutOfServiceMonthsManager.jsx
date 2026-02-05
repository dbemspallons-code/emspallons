import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertCircle } from 'lucide-react';
import { fetchGlobalSettings, saveGlobalSettings } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';

const MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

export default function OutOfServiceMonthsManager({ onClose }) {
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await fetchGlobalSettings();
      const pausedMonths = Array.isArray(settings.pausedMonths) ? settings.pausedMonths : [];
      
      // Extraire les mois sélectionnés (format: YYYY-MM)
      const months = pausedMonths.map(monthId => {
        const parts = monthId.split('-');
        return parts.length === 2 ? parts[1] : null;
      }).filter(Boolean);
      
      setSelectedMonths(months);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      setMessage('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (monthValue) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthValue)) {
        return prev.filter(m => m !== monthValue);
      } else {
        return [...prev, monthValue].sort();
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      // Construire les sessionIds (format: YYYY-MM)
      const pausedMonths = selectedMonths.map(month => `${currentYear}-${month}`);
      
      const currentUser = await getCurrentUser().catch(() => null);
      await saveGlobalSettings({
        pausedMonths,
      }, {
        userId: currentUser?.uid || null,
      });
      
      setMessage('Mois hors service enregistrés avec succès');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setMessage('Erreur lors de l\'enregistrement : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getMonthStatus = (monthValue) => {
    const monthId = `${currentYear}-${monthValue}`;
    return selectedMonths.includes(monthValue);
  };

  if (loading) {
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
      }}>
        <div className="card" style={{ padding: '2rem' }}>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

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
      <div className="card modal-enter" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--warning" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <Calendar size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Gestion des mois hors service</h2>
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

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
            <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Important</p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#92400e' }}>
                Les mois marqués comme "hors service" ne seront pas comptabilisés dans les abonnements. 
                Si un étudiant paie pour un mois hors service, l'abonnement sera automatiquement décalé au mois suivant.
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Année
          </label>
          <select
            className="input-field"
            value={currentYear}
            onChange={(e) => {
              setCurrentYear(parseInt(e.target.value, 10));
              setSelectedMonths([]); // Réinitialiser la sélection lors du changement d'année
            }}
            style={{ width: '200px' }}
          >
            {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
            Sélectionner les mois hors service pour {currentYear}
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
            gap: '0.75rem' 
          }}>
            {MONTHS.map(month => {
              const isSelected = getMonthStatus(month.value);
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => toggleMonth(month.value)}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    background: isSelected ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? '#2563eb' : '#0f172a',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  {month.label}
                  {isSelected && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#2563eb' }}>
                      ✓ Sélectionné
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedMonths.length > 0 && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600 }}>
              Mois sélectionnés ({selectedMonths.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {selectedMonths.map(month => {
                const monthName = MONTHS.find(m => m.value === month)?.label || month;
                return (
                  <span key={month} className="chip" style={{ background: '#2563eb', color: 'white' }}>
                    {monthName} {currentYear}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {message && (
          <div style={{
            padding: '0.75rem',
            background: message.includes('succès') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            border: `1px solid ${message.includes('succès') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
            borderRadius: '8px',
            marginBottom: '1rem',
            color: message.includes('succès') ? '#059669' : '#dc2626',
            fontSize: '0.9rem'
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="button button--subtle" type="button" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button className="button" type="button" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

