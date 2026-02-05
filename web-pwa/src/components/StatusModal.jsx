import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
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
  width: 'min(480px, 100%)',
  background: '#ffffff',
  borderRadius: '20px',
  boxShadow: '0 24px 64px rgba(15, 23, 42, 0.22)',
  padding: '1.75rem',
  position: 'relative',
};

const STATUS_OPTIONS = [
  { value: PAYMENT_STATUS.UP_TO_DATE, label: 'À jour', icon: CheckCircle, color: '#22c55e' },
  { value: PAYMENT_STATUS.LATE, label: 'En retard', icon: AlertTriangle, color: '#f59e0b' },
  { value: PAYMENT_STATUS.OUT_OF_SERVICE, label: 'Non payé', icon: X, color: '#dc2626' },
  { value: PAYMENT_STATUS.EXPIRED, label: 'Expiré', icon: X, color: '#991b1b' },
];

export default function StatusModal({ open, student, onClose, onSubmit }) {
  const [selectedStatus, setSelectedStatus] = useState(student?.paymentStatus || PAYMENT_STATUS.UP_TO_DATE);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (student) {
      setSelectedStatus(student.paymentStatus || PAYMENT_STATUS.UP_TO_DATE);
    }
  }, [student]);

  if (!open || !student) return null;

  const handleSubmit = async event => {
    event.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      await onSubmit({
        studentId: student.id,
        paymentStatus: selectedStatus,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Impossible de modifier le statut.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true">
      <div style={modalStyle} className="modal-enter">
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
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>Modifier le statut de paiement</h2>
          <p className="subtitle">{student.name} — {student.contact || 'Contact inconnu'}</p>
        </header>

        <form className="layout-grid" style={{ gap: '1rem' }} onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <label style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Nouveau statut</label>
            {STATUS_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = selectedStatus === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    border: `2px solid ${isSelected ? option.color : '#e2e8f0'}`,
                    background: isSelected ? `${option.color}15` : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={20} color={option.color} />
                  <span style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? option.color : '#334155' }}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          {error ? (
            <div className="card" style={{ padding: '0.9rem', background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(220, 38, 38, 0.4)' }}>
              <p className="subtitle" style={{ color: '#b91c1c', margin: 0 }}>
                <AlertTriangle size={16} style={{ marginRight: '0.35rem' }} /> {error}
              </p>
            </div>
          ) : null}

          <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="button button--subtle" onClick={onClose}>
              <X size={16} /> Annuler
            </button>
            <button type="submit" className="button" disabled={processing}>
              <CheckCircle size={16} /> {processing ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

