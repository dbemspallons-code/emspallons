import React, { useState, useMemo } from 'react';
import { X, CheckCircle, Bell, Users, User } from 'lucide-react';
import { PAYMENT_STATUS } from '../models/entities';

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.32)',
  backdropFilter: 'blur(4px)',
  display: 'grid',
  placeItems: 'center',
  padding: '1.5rem',
  zIndex: 40,
};

const modalStyle = {
  width: 'min(600px, 100%)',
  maxHeight: '90vh',
  overflow: 'auto',
  background: '#ffffff',
  borderRadius: '20px',
  boxShadow: '0 24px 64px rgba(15, 23, 42, 0.22)',
  padding: '1.75rem',
  position: 'relative',
};

export default function ReminderModal({ open, students = [], onClose, onSend, lines = [] }) {
  const [reminderType, setReminderType] = useState('individual'); // 'individual' ou 'group'
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // Filtrer par statut
  const [lineFilter, setLineFilter] = useState('all'); // Filtrer par ligne

  const filteredStudents = useMemo(() => {
    // Filtrer les étudiants qui ont un contact
    let filtered = students.filter(s => s.contact && s.contact.trim());
    
    // Filtrer par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.paymentStatus === statusFilter);
    }
    
    // Filtrer par ligne
    if (lineFilter !== 'all') {
      filtered = filtered.filter(s => s.busLine === lineFilter);
    }
    
    // Trier par statut : out_of_service en premier, puis late, puis up_to_date
    const statusOrder = {
      [PAYMENT_STATUS.OUT_OF_SERVICE]: 1,
      [PAYMENT_STATUS.LATE]: 2,
      [PAYMENT_STATUS.UP_TO_DATE]: 3,
    };
    
    filtered.sort((a, b) => {
      const orderA = statusOrder[a.paymentStatus] || 99;
      const orderB = statusOrder[b.paymentStatus] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // Si même statut, trier par nom
      return (a.name || '').localeCompare(b.name || '');
    });
    
    return filtered;
  }, [students, statusFilter, lineFilter]);

  React.useEffect(() => {
    if (reminderType === 'group') {
      // Sélectionner tous les étudiants avec contact par défaut
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  }, [reminderType, filteredStudents]);

  if (!open) return null;

  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async event => {
    event.preventDefault();
    
    if (selectedStudents.length === 0) {
      setError('Veuillez sélectionner au moins un étudiant.');
      return;
    }
    
    if (!message.trim()) {
      setError('Veuillez saisir un message de rappel.');
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      const studentsToSend = filteredStudents.filter(s => selectedStudents.includes(s.id));
      await onSend(studentsToSend, message);
      setMessage('');
      setSelectedStudents([]);
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi des rappels.');
    } finally {
      setProcessing(false);
    }
  };

  const defaultMessage = `Bonjour {nom},\n\nRappel : Votre abonnement de transport scolaire arrive à expiration.\n\n👤 Étudiant : {nom}\n🚌 Ligne : {ligne}\n📅 Expiration : {expiration}\n💰 Statut actuel : {statut}\n\nVeuillez régulariser votre situation pour continuer à bénéficier du service.\n\nMerci de votre compréhension.\n\nEMSP - Ecole Multinationale Supérieure des Postes d'Abidjan`;

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          <X size={20} />
        </button>

        <header style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Envoyer des rappels</h2>
          <p className="subtitle">Envoyez des notifications de rappel aux étudiants via WhatsApp</p>
        </header>

        <form className="layout-grid" style={{ gap: '1rem' }} onSubmit={handleSubmit}>
          {/* Filtres par statut et ligne */}
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
            <label className="layout-grid" style={{ gap: '0.4rem' }}>
              <span style={{ fontWeight: 600 }}>Filtrer par statut</span>
              <select
                className="input-field"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="up_to_date">À jour</option>
                <option value="late">En retard</option>
                <option value="out_of_service">Suspendu</option>
              </select>
            </label>
            <label className="layout-grid" style={{ gap: '0.4rem' }}>
              <span style={{ fontWeight: 600 }}>Filtrer par ligne</span>
              <select
                className="input-field"
                value={lineFilter}
                onChange={event => setLineFilter(event.target.value)}
              >
                <option value="all">Toutes les lignes</option>
                {lines.map(line => (
                  <option key={line.id} value={line.id}>{line.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <label style={{ fontWeight: 600 }}>Type d'envoi</label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setReminderType('individual')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: `2px solid ${reminderType === 'individual' ? '#2563eb' : '#e2e8f0'}`,
                  background: reminderType === 'individual' ? '#2563eb15' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <User size={18} color={reminderType === 'individual' ? '#2563eb' : '#64748b'} />
                <span style={{ fontWeight: reminderType === 'individual' ? 600 : 400 }}>
                  Individuel
                </span>
              </button>
              <button
                type="button"
                onClick={() => setReminderType('group')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: `2px solid ${reminderType === 'group' ? '#2563eb' : '#e2e8f0'}`,
                  background: reminderType === 'group' ? '#2563eb15' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <Users size={18} color={reminderType === 'group' ? '#2563eb' : '#64748b'} />
                <span style={{ fontWeight: reminderType === 'group' ? 600 : 400 }}>
                  Groupe
                </span>
              </button>
            </div>
          </div>

          {reminderType === 'individual' && (
            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflow: 'auto' }}>
              <label style={{ fontWeight: 600 }}>Sélectionner les étudiants ({selectedStudents.length} sélectionné{selectedStudents.length > 1 ? 's' : ''})</label>
              {filteredStudents.length === 0 ? (
                <p className="subtitle">Aucun étudiant avec contact disponible.</p>
              ) : (
                (() => {
                  // Grouper les étudiants par statut
                  const groupedByStatus = filteredStudents.reduce((acc, student) => {
                    const status = student.paymentStatus || 'unknown';
                    if (!acc[status]) {
                      acc[status] = [];
                    }
                    acc[status].push(student);
                    return acc;
                  }, {});

                  // Ordre d'affichage des statuts
                  const statusDisplayOrder = [
                    PAYMENT_STATUS.OUT_OF_SERVICE,
                    PAYMENT_STATUS.LATE,
                    PAYMENT_STATUS.UP_TO_DATE,
                  ];

                  const statusLabels = {
                    [PAYMENT_STATUS.OUT_OF_SERVICE]: 'Suspendu',
                    [PAYMENT_STATUS.LATE]: 'En retard',
                    [PAYMENT_STATUS.UP_TO_DATE]: 'À jour',
                  };

                  const statusColors = {
                    [PAYMENT_STATUS.OUT_OF_SERVICE]: '#dc2626',
                    [PAYMENT_STATUS.LATE]: '#f97316',
                    [PAYMENT_STATUS.UP_TO_DATE]: '#16a34a',
                  };

                  return (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {statusDisplayOrder
                        .filter(status => groupedByStatus[status] && groupedByStatus[status].length > 0)
                        .map(status => (
                          <div key={status} style={{ display: 'grid', gap: '0.5rem' }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              padding: '0.5rem',
                              background: `${statusColors[status]}15`,
                              borderRadius: '6px',
                              border: `1px solid ${statusColors[status]}40`
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: statusColors[status]
                              }} />
                              <span style={{ 
                                fontWeight: 600, 
                                fontSize: '0.9rem',
                                color: statusColors[status]
                              }}>
                                {statusLabels[status]} ({groupedByStatus[status].length})
                              </span>
                            </div>
                            <div style={{ display: 'grid', gap: '0.5rem', marginLeft: '1rem' }}>
                              {groupedByStatus[status].map(student => (
                                <label
                                  key={student.id}
                                  style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: `2px solid ${selectedStudents.includes(student.id) ? '#2563eb' : '#e2e8f0'}`,
                                    background: selectedStudents.includes(student.id) ? '#2563eb10' : '#ffffff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedStudents.includes(student.id)}
                                    onChange={() => handleToggleStudent(student.id)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                                    <div className="subtitle" style={{ fontSize: '0.85rem' }}>
                                      {student.contact} • {student.busLine}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {reminderType === 'group' && (
            <div className="card" style={{ padding: '1rem', background: '#f1f5f9' }}>
              <p className="subtitle" style={{ margin: 0 }}>
                <Users size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                {filteredStudents.length} étudiant{filteredStudents.length > 1 ? 's' : ''} recevra{filteredStudents.length > 1 ? 'ont' : ''} le rappel
              </p>
            </div>
          )}

          <label className="layout-grid" style={{ gap: '0.4rem' }}>
            <span style={{ fontWeight: 600 }}>Message de rappel (personnalisé)</span>
            <textarea
              className="input-field"
              rows={8}
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder={defaultMessage}
              style={{ resize: 'vertical' }}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '-0.5rem' }}>
              <strong>Variables disponibles :</strong> {'{nom}'}, {'{etudiant}'}, {'{ligne}'}, {'{expiration}'}, {'{statut}'}, {'{niveau}'}, {'{contact}'}, {'{parent}'}
            </div>
            <button
              type="button"
              className="button button--subtle"
              onClick={() => setMessage(defaultMessage)}
              style={{ fontSize: '0.85rem', padding: '0.5rem' }}
            >
              Utiliser le message par défaut
            </button>
          </label>

          {error ? (
            <div className="card" style={{ padding: '0.9rem', background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(220, 38, 38, 0.4)' }}>
              <p className="subtitle" style={{ color: '#b91c1c', margin: 0 }}>
                <X size={16} style={{ marginRight: '0.35rem' }} /> {error}
              </p>
            </div>
          ) : null}

          <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="button button--subtle" onClick={onClose}>
              <X size={16} /> Annuler
            </button>
            <button type="submit" className="button" disabled={processing || selectedStudents.length === 0}>
              <Bell size={16} /> {processing ? 'Envoi...' : `Envoyer (${selectedStudents.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

