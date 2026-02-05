import React, { useState, useEffect } from 'react';
import { X, Save, Bell, Mail, MessageSquare, Send } from 'lucide-react';
import { fetchRemindersConfig, saveRemindersConfig, REMINDER_TYPES, REMINDER_CHANNELS } from '../services/reminderService';
import { getCurrentUser } from '../services/authService';

export default function RemindersConfigModal({ onClose }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('config'); // 'config' ou 'send'

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configData = await fetchRemindersConfig();
      setConfig(configData);
    } catch (error) {
      console.error('Erreur chargement configuration:', error);
      setMessage('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      const currentUser = await getCurrentUser().catch(() => null);
      await saveRemindersConfig(config, {
        userId: currentUser?.uid || null,
      });
      
      setMessage('Configuration enregistrée avec succès');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setMessage('Erreur lors de l\'enregistrement : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTypeConfig = (type, updates) => {
    setConfig(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: {
          ...prev.types[type],
          ...updates,
        },
      },
    }));
  };

  if (loading || !config) {
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

  const reminderTypeLabels = {
    [REMINDER_TYPES.EXPIRING_SOON]: 'Proche expiration',
    [REMINDER_TYPES.EXPIRING_TODAY]: 'Jour d\'expiration',
    [REMINDER_TYPES.PAYMENT_OVERDUE]: 'Retard de paiement',
    [REMINDER_TYPES.SUBSCRIPTION_ENDED]: 'Abonnement terminé',
  };

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
      <div className="card modal-enter" style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--info" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <Bell size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Configuration des rappels</h2>
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

        {/* Onglets */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
          <button
            className={`button ${activeTab === 'config' ? '' : 'button--subtle'}`}
            type="button"
            onClick={() => setActiveTab('config')}
            style={{ borderBottom: activeTab === 'config' ? '2px solid #2563eb' : 'none', borderRadius: 0 }}
          >
            <Bell size={16} /> Configuration
          </button>
        </div>

        {activeTab === 'config' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <span style={{ fontWeight: 600 }}>Activer le système de rappels</span>
              </label>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {Object.entries(REMINDER_TYPES).map(([key, type]) => {
                const typeConfig = config.types[type] || {};
                return (
                  <div key={type} className="card" style={{ padding: '1.5rem', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                        {reminderTypeLabels[type]}
                      </h3>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={typeConfig.enabled !== false}
                          onChange={(e) => updateTypeConfig(type, { enabled: e.target.checked })}
                        />
                        <span style={{ fontSize: '0.9rem' }}>Activer</span>
                      </label>
                    </div>

                    {typeConfig.enabled !== false && (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {type === REMINDER_TYPES.EXPIRING_SOON && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                              Jours avant expiration
                            </label>
                            <input
                              className="input-field"
                              type="number"
                              min="0"
                              value={typeConfig.daysBefore || 7}
                              onChange={(e) => updateTypeConfig(type, { daysBefore: parseInt(e.target.value, 10) || 0 })}
                              style={{ width: '150px' }}
                            />
                          </div>
                        )}

                        {(type === REMINDER_TYPES.PAYMENT_OVERDUE || type === REMINDER_TYPES.SUBSCRIPTION_ENDED) && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                              Jours après expiration
                            </label>
                            <input
                              className="input-field"
                              type="number"
                              min="0"
                              value={typeConfig.daysAfter || 3}
                              onChange={(e) => updateTypeConfig(type, { daysAfter: parseInt(e.target.value, 10) || 0 })}
                              style={{ width: '150px' }}
                            />
                          </div>
                        )}

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                            Canal d'envoi
                          </label>
                          <select
                            className="input-field"
                            value={typeConfig.channel || REMINDER_CHANNELS.WHATSAPP}
                            onChange={(e) => updateTypeConfig(type, { channel: e.target.value })}
                            style={{ width: '200px' }}
                          >
                            <option value={REMINDER_CHANNELS.WHATSAPP}>WhatsApp</option>
                            <option value={REMINDER_CHANNELS.SMS}>SMS</option>
                            <option value={REMINDER_CHANNELS.EMAIL}>Email</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                            Template du message
                          </label>
                          <textarea
                            className="input-field"
                            rows={4}
                            value={typeConfig.template || ''}
                            onChange={(e) => updateTypeConfig(type, { template: e.target.value })}
                            placeholder="Message avec variables: {nom}, {prenom}, {date_expiration}, etc."
                          />
                          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Variables disponibles: {'{nom}'}, {'{prenom}'}, {'{nom_complet}'}, {'{contact}'}, {'{ligne}'}, {'{date_expiration}'}, {'{jours_restants}'}, {'{jours_retard}'}, {'{montant}'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
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
            marginTop: '1.5rem',
            color: message.includes('succès') ? '#059669' : '#dc2626',
            fontSize: '0.9rem'
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
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

