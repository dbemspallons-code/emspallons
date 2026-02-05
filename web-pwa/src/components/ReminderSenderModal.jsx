import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, Filter, CheckSquare, Square, Loader } from 'lucide-react';
import { sendBulkReminders, REMINDER_TYPES, fetchRemindersConfig } from '../services/reminderService';
import { fetchStudents } from '../services/firestoreService';
import { getCurrentUser } from '../services/authService';
import { computeSubscriptionStatus } from '../models/entities';

const REMINDER_TYPE_LABELS = {
  [REMINDER_TYPES.EXPIRING_SOON]: 'Proche expiration',
  [REMINDER_TYPES.EXPIRING_TODAY]: 'Jour d\'expiration',
  [REMINDER_TYPES.PAYMENT_OVERDUE]: 'Retard de paiement',
  [REMINDER_TYPES.SUBSCRIPTION_ENDED]: 'Abonnement terminé',
};

export default function ReminderSenderModal({ students = [], lines = [], onClose, onSuccess }) {
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [reminderType, setReminderType] = useState(REMINDER_TYPES.EXPIRING_SOON);
  const [filters, setFilters] = useState({ line: 'all', status: 'all', daysBefore: 7 });
  const [previewMessage, setPreviewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [config, setConfig] = useState(null);
  const [allStudents, setAllStudents] = useState(students);

  useEffect(() => {
    loadConfig();
    if (students.length === 0) {
      loadAllStudents();
    }
  }, []);

  useEffect(() => {
    updatePreview();
  }, [reminderType, selectedStudents, config]);

  const loadConfig = async () => {
    try {
      const configData = await fetchRemindersConfig();
      setConfig(configData);
    } catch (error) {
      console.error('Erreur chargement config:', error);
    }
  };

  const loadAllStudents = async () => {
    try {
      const studentsData = await fetchStudents();
      setAllStudents(studentsData);
    } catch (error) {
      console.error('Erreur chargement étudiants:', error);
    }
  };

  const updatePreview = async () => {
    if (!config || selectedStudents.size === 0) {
      setPreviewMessage('');
      return;
    }

    const typeConfig = config.types[reminderType];
    if (!typeConfig || !typeConfig.enabled) {
      setPreviewMessage('Ce type de rappel n\'est pas activé');
      return;
    }

    // Prendre le premier étudiant sélectionné pour la prévisualisation
    const firstStudentId = Array.from(selectedStudents)[0];
    const student = allStudents.find(s => s.id === firstStudentId);
    
    if (student) {
      const message = replaceTemplateVariables(typeConfig.template, student, reminderType);
      setPreviewMessage(message);
    }
  };

  const replaceTemplateVariables = (template, student, reminderType) => {
    const now = new Date();
    const expirationDate = student.subscription?.expiresAt ? new Date(student.subscription.expiresAt) : null;
    
    const variables = {
      nom: student.name?.split(' ')[0] || '',
      prenom: student.name?.split(' ').slice(1).join(' ') || '',
      nom_complet: student.name || '',
      contact: student.contact || '',
      ligne: lines.find(l => l.id === student.busLine)?.name || student.busLine || '',
      date_expiration: expirationDate ? expirationDate.toLocaleDateString('fr-FR') : '',
      jours_restants: expirationDate ? Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0,
      jours_retard: expirationDate ? Math.max(0, Math.ceil((now.getTime() - expirationDate.getTime()) / (24 * 60 * 60 * 1000))) : 0,
      montant: student.monthlyFee || 0,
    };
    
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    
    return message;
  };

  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      if (filters.line !== 'all' && student.busLine !== filters.line) return false;
      if (filters.status !== 'all') {
        // Calculer le statut de l'étudiant
        const status = computeSubscriptionStatus(student);
        if (filters.status === 'expiring_soon' && status.daysRemaining > filters.daysBefore) return false;
        if (filters.status === 'expired' && status.status !== 'EXPIRÉ') return false;
        if (filters.status === 'active' && status.status !== 'ACTIF') return false;
      }
      return true;
    });
  }, [allStudents, filters, lines]);

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleSend = async () => {
    if (selectedStudents.size === 0) {
      alert('Veuillez sélectionner au moins un étudiant');
      return;
    }

    if (!window.confirm(`Envoyer ${selectedStudents.size} rappel(s) de type "${REMINDER_TYPE_LABELS[reminderType]}" ?`)) {
      return;
    }

    try {
      setSending(true);
      setProgress({ current: 0, total: selectedStudents.size });

      const currentUser = await getCurrentUser().catch(() => null);
      const studentIds = Array.from(selectedStudents);
      
      const results = await sendBulkReminders(studentIds, reminderType, {
        userId: currentUser?.uid || null,
        userName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Système',
      });

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      if (onSuccess) {
        await onSuccess({ successCount, errorCount, total: results.length });
      }

      alert(`${successCount} rappel(s) envoyé(s) avec succès.${errorCount > 0 ? ` ${errorCount} erreur(s).` : ''}`);
      onClose();
    } catch (error) {
      alert('Erreur lors de l\'envoi : ' + error.message);
    } finally {
      setSending(false);
      setProgress({ current: 0, total: 0 });
    }
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
              <Send size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Envoyer des rappels</h2>
          </div>
          <button
            className="button button--subtle"
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem' }}
            disabled={sending}
          >
            <X size={20} />
          </button>
        </header>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Type de rappel */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Type de rappel *
            </label>
            <select
              className="input-field"
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value)}
              disabled={sending}
            >
              {Object.entries(REMINDER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Filtres */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                <Filter size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Ligne
              </label>
              <select
                className="input-field"
                value={filters.line}
                onChange={(e) => setFilters(prev => ({ ...prev, line: e.target.value }))}
                disabled={sending}
              >
                <option value="all">Toutes les lignes</option>
                {lines.map(line => (
                  <option key={line.id} value={line.id}>{line.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                Statut
              </label>
              <select
                className="input-field"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                disabled={sending}
              >
                <option value="all">Tous les statuts</option>
                <option value="expiring_soon">Expire bientôt</option>
                <option value="expired">Expiré</option>
                <option value="active">Actif</option>
              </select>
            </div>
          </div>

          {/* Prévisualisation */}
          {previewMessage && (
            <div style={{ padding: '1rem', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600 }}>Aperçu du message :</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{previewMessage}</p>
            </div>
          )}

          {/* Liste des étudiants */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                Étudiants ({filteredStudents.length})
              </h3>
              <button
                className="button button--subtle"
                type="button"
                onClick={toggleAll}
                disabled={sending || filteredStudents.length === 0}
                style={{ fontSize: '0.85rem' }}
              >
                {selectedStudents.size === filteredStudents.length ? (
                  <><CheckSquare size={14} /> Tout désélectionner</>
                ) : (
                  <><Square size={14} /> Tout sélectionner</>
                )}
              </button>
            </div>

            <div style={{ 
              maxHeight: '300px', 
              overflow: 'auto', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px',
              padding: '0.5rem'
            }}>
              {filteredStudents.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Aucun étudiant ne correspond aux filtres
                </p>
              ) : (
                filteredStudents.map(student => {
                  const isSelected = selectedStudents.has(student.id);
                  const status = computeSubscriptionStatus(student);
                  return (
                    <div
                      key={student.id}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        background: isSelected ? '#eff6ff' : 'white',
                        border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        cursor: sending ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                      onClick={() => !sending && toggleStudent(student.id)}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} style={{ color: '#2563eb' }} />
                      ) : (
                        <Square size={18} style={{ color: '#94a3b8' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{student.name}</p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                          {lines.find(l => l.id === student.busLine)?.name || 'N/A'} • {student.contact || 'Pas de contact'}
                        </p>
                      </div>
                      <span className={`chip ${status.status === 'ACTIF' ? 'chip--success' : status.status === 'EXPIRÉ' ? 'chip--danger' : ''}`} style={{ fontSize: '0.75rem' }}>
                        {status.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
              {selectedStudents.size} étudiant(s) sélectionné(s) sur {filteredStudents.length}
            </p>
          </div>

          {/* Barre de progression */}
          {sending && progress.total > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Envoi en cours...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  height: '100%',
                  background: '#2563eb',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className="button button--subtle"
              type="button"
              onClick={onClose}
              disabled={sending}
            >
              Annuler
            </button>
            <button
              className="button"
              type="button"
              onClick={handleSend}
              disabled={sending || selectedStudents.size === 0}
            >
              {sending ? (
                <><Loader size={16} className="spin" /> Envoi...</>
              ) : (
                <><Send size={16} /> Envoyer {selectedStudents.size} rappel(s)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

