import React from 'react';
import { MessageCircle, X, Copy } from 'lucide-react';

export default function WhatsAppReminderModal({
  open,
  onClose,
  reminders = [],
  onSendOne,
  onSendAll,
  onCopyMessage,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content ui-card" style={{ maxWidth: '960px' }}>
        <header className="modal-header">
          <div>
            <h2 className="section-title">Rappels WhatsApp</h2>
            <p className="subtitle">Envoi 0€ : messages prêts, ouverture WhatsApp en un clic.</p>
          </div>
          <div className="toolbar">
            {reminders.length > 0 && (
              <button type="button" className="button" onClick={onSendAll}>
                Ouvrir tout
              </button>
            )}
            <button type="button" className="button button--subtle" onClick={onClose}>
              <X size={16} /> Fermer
            </button>
          </div>
        </header>

        {reminders.length === 0 ? (
          <div className="list-empty card" style={{ padding: '1.5rem' }}>
            Aucun rappel à envoyer pour le moment.
          </div>
        ) : (
          <div className="layout-grid" style={{ gap: '1rem' }}>
            {reminders.map((reminder) => (
              <article key={reminder.id} className="card" style={{ padding: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                      {reminder.studentName}
                    </h3>
                    <p className="subtitle" style={{ margin: '0.25rem 0 0' }}>
                      Expiration: {reminder.expiresAtLabel} • {reminder.statusLabel}
                    </p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
                      {reminder.messagePreview}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {onCopyMessage && (
                      <button
                        type="button"
                        className="button button--subtle"
                        onClick={() => onCopyMessage(reminder)}
                      >
                        <Copy size={16} /> Copier
                      </button>
                    )}
                    <button
                      type="button"
                      className="ui-btn ui-btn--primary"
                      onClick={() => onSendOne(reminder)}
                    >
                      <MessageCircle size={16} /> Ouvrir WhatsApp
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
