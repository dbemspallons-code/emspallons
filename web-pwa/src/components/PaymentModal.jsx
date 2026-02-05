import React, { useMemo, useState, useEffect } from 'react';
import { CalendarDays, CreditCard, X, CheckCircle, AlertTriangle, Eye, Send, HelpCircle } from 'lucide-react';
import { SUBSCRIPTION_PLANS, computeExpirationDate } from '../models/entities';
import { exportPaymentReceiptPDF, generateReceiptImage } from '../services/exportPDF';
import { openWhatsAppWithMessage, openWhatsAppWithImage } from '../services/whatsappService';

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
  width: 'min(540px, 100%)',
  background: '#ffffff',
  borderRadius: '20px',
  boxShadow: '0 24px 64px rgba(15, 23, 42, 0.22)',
  padding: '1.75rem',
  position: 'relative',
  maxHeight: '85vh',
  overflowY: 'auto',
};

// PRIX FIXE DE L'ABONNEMENT : 12 500 FCFA par mois
const PRIX_MENSUEL_FIXE = 12500;
const SCHOOL_INFO = {
  name: "Ecole Multinationale Supérieure des Postes d'Abidjan",
  address: "Abidjan, Côte d'Ivoire",
  logoUrl: "/images/logos/emsp-logo.png",
};

// Composant d'aide contextuelle
function HelpTooltip({ text }) {
  const [show, setShow] = useState(false);
  if (!text) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '0.25rem' }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(!show); }}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}
        title="Aide"
      >
        <HelpCircle size={14} />
      </button>
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '0.5rem',
            background: '#1e293b',
            color: '#ffffff',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            maxWidth: '280px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            whiteSpace: 'pre-line',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>💡 Aide</span>
            <button type="button" onClick={() => setShow(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ffffff', padding: 0 }}>
              <X size={14} />
            </button>
          </div>
          <div>{text}</div>
          <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1e293b' }} />
        </div>
      )}
    </span>
  );
}

export default function PaymentModal({ open, student, onClose, onSubmit, plans = SUBSCRIPTION_PLANS, defaultMonthlyFee = 12500, initialPaidAt, initialMonths = null, initialPlanId = null, mode = 'paiement', currentUser = null }) {
  // Nouvelle structure : montantTotal, nombreMois, dateDebut
  const [montantTotal, setMontantTotal] = useState(PRIX_MENSUEL_FIXE);
  const [nombreMois, setNombreMois] = useState(() => (initialMonths && initialMonths > 0) ? initialMonths : 1);
  const [dateDebut, setDateDebut] = useState(() => {
    if (initialPaidAt) return new Date(initialPaidAt).toISOString().slice(0, 10);
    // Par défaut : premier jour du mois actuel
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [description, setDescription] = useState('');
  
  // Options de nombre de mois
  const moisOptions = [1, 2, 3, 5, 6, 12];
  
  // Calcul automatique de dateFin et montantMensuel
  const calculs = useMemo(() => {
    const dateDebutObj = new Date(dateDebut);
    const dateFinObj = new Date(dateDebutObj);
    dateFinObj.setMonth(dateFinObj.getMonth() + nombreMois);
    const montantMensuel = montantTotal / nombreMois;
    return {
      dateFin: dateFinObj.toISOString().slice(0, 10),
      dateFinLabel: dateFinObj.toLocaleDateString('fr-FR'),
      montantMensuel: Math.round(montantMensuel * 100) / 100,
    };
  }, [dateDebut, nombreMois, montantTotal]);
  
  // Mettre à jour montantTotal quand nombreMois change
  useEffect(() => {
    setMontantTotal(nombreMois * PRIX_MENSUEL_FIXE);
  }, [nombreMois]);
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (open) {
      setSuccessMessage('');
      setError(null);
      // Réinitialiser les champs quand le modal s'ouvre
      const now = new Date();
      setNombreMois(initialMonths || 1);
      setMontantTotal((initialMonths || 1) * PRIX_MENSUEL_FIXE);
      setDateDebut(initialPaidAt ? new Date(initialPaidAt).toISOString().slice(0, 10) : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setDescription('');
    }
  }, [open, student?.id, initialMonths, initialPaidAt]);

  if (!open || !student) return null;

  const handleSubmit = async event => {
    event.preventDefault();
    setProcessing(true);
    setError(null);
    setSuccessMessage('');
    try {
      // Validation : s'assurer que le montant total est valide
      if (!Number.isFinite(montantTotal) || montantTotal <= 0) {
        setError('Le montant total doit être supérieur à 0.');
        setProcessing(false);
        return;
      }
      
      // Validation : s'assurer que le nombre de mois est valide
      if (!moisOptions.includes(nombreMois)) {
        setError('Le nombre de mois doit être 1, 2, 3, 5, 6 ou 12.');
        setProcessing(false);
        return;
      }
      
      // Validation : s'assurer que l'étudiant existe
      if (!student || !student.id) {
        setError('Étudiant invalide.');
        setProcessing(false);
        return;
      }
      
      // Validation : s'assurer que la date de début est valide
      const dateDebutObj = new Date(dateDebut);
      if (Number.isNaN(dateDebutObj.getTime())) {
        setError('Date de début invalide.');
        setProcessing(false);
        return;
      }
      
      // Nouvelle structure de paiement
      const payload = {
        studentId: student.id,
        montantTotal: Math.round(montantTotal),
        nombreMois,
        dateDebut: dateDebutObj.toISOString(),
        description: description.trim(),
      };
      
      await onSubmit(payload);
      
      // Créer le reçu avec la nouvelle structure
      const reference = `${student.id}-${Date.now()}`;
      const receipt = {
        ...payload,
        dateFin: calculs.dateFin,
        montantMensuel: calculs.montantMensuel,
        reference,
        monthsCount: nombreMois,
        amountPerMonth: calculs.montantMensuel,
        paidAt: dateDebut,
        ledger: [], // Pas utilisé dans la nouvelle structure
      };
      setLastPayment(receipt);
      // Afficher le reçu dans une nouvelle fenêtre (sans auto-impression)
      const recordedBy = currentUser ? {
        name: currentUser.name || currentUser.email?.split('@')[0] || 'Utilisateur',
        email: currentUser.email,
      } : null;
      exportPaymentReceiptPDF({ student, payment: { ...receipt, recordedAt: new Date().toISOString() }, recordedBy }, SCHOOL_INFO, { showPrintDialog: false });
      setSuccessMessage('Reçu généré. Utilisez les boutons ci-dessous pour l'envoyer ou le télécharger.');
      // Réinitialiser les champs après paiement réussi
      const now = new Date();
      setNombreMois(1);
      setMontantTotal(PRIX_MENSUEL_FIXE);
      setDateDebut(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setDescription('');
    } catch (err) {
      setError(err.message || 'Impossible de valider le paiement.');
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
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>{mode === 'reabonnement' ? 'Réabonnement' : 'Enregistrer un paiement'}</h2>
          <p className="subtitle">{student.name} — {student.contact || 'Contact inconnu'}</p>
        </header>

        <form className="layout-grid" style={{ gap: '1rem' }} onSubmit={handleSubmit}>
          <label className="layout-grid" style={{ gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              Nombre de mois couverts
              <HelpTooltip text="Sélectionnez combien de mois sont couverts par ce paiement. L'abonnement sera calculé automatiquement." />
            </span>
            <select
              className="input-field"
              value={nombreMois}
              onChange={event => setNombreMois(Number(event.target.value))}
            >
              {moisOptions.map(mois => (
                <option key={mois} value={mois}>{mois} mois</option>
              ))}
            </select>
          </label>
          
          <label className="layout-grid" style={{ gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              Montant total payé (FCFA)
              <HelpTooltip text="Montant total reçu pour cet abonnement. Le montant mensuel sera calculé automatiquement." />
            </span>
            <input
              className="input-field"
              type="number"
              min={0}
              step="100"
              value={montantTotal || ''}
              onChange={event => {
                const newValue = Number(event.target.value);
                if (Number.isFinite(newValue) && newValue >= 0) {
                  setMontantTotal(newValue);
                } else if (event.target.value === '') {
                  setMontantTotal(nombreMois * PRIX_MENSUEL_FIXE);
                }
              }}
              onBlur={event => {
                if (event.target.value === '' || Number(event.target.value) < 0) {
                  setMontantTotal(nombreMois * PRIX_MENSUEL_FIXE);
                }
              }}
            />
            <small className="subtitle" style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Montant calculé : {nombreMois} mois × {PRIX_MENSUEL_FIXE.toLocaleString('fr-FR')} FCFA = {(nombreMois * PRIX_MENSUEL_FIXE).toLocaleString('fr-FR')} FCFA
            </small>
          </label>
          
          <label className="layout-grid" style={{ gap: '0.4rem' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              Date de début
              <HelpTooltip text="Date à partir de laquelle l'abonnement commence. Par défaut : premier jour du mois actuel." />
            </span>
            <input
              className="input-field"
              type="date"
              value={dateDebut}
              onChange={event => setDateDebut(event.target.value)}
            />
          </label>
          
          <div className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)', border: '1px solid #facc15' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <CheckCircle size={18} style={{ color: '#22c55e' }} />
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Calculs automatiques</strong>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div><strong>Date de fin :</strong> {calculs.dateFinLabel}</div>
              <div><strong>Montant mensuel :</strong> {calculs.montantMensuel.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>
          
          <label className="layout-grid" style={{ gap: '0.4rem' }}>
            <span style={{ fontWeight: 600 }}>Description (optionnel)</span>
            <input
              className="input-field"
              type="text"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Ex: Paiement anticipé, Réduction spéciale..."
            />
          </label>

          {error ? (
            <div className="card" style={{ padding: '0.9rem', background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(220, 38, 38, 0.4)' }}>
              <p className="subtitle" style={{ color: '#b91c1c', margin: 0 }}>
                <AlertTriangle size={16} style={{ marginRight: '0.35rem' }} /> {error}
              </p>
            </div>
          ) : null}
          {successMessage ? (
            <div className="card" style={{ padding: '0.9rem', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.32)' }}>
              <p className="subtitle" style={{ color: '#15803d', margin: 0 }}>
                {successMessage}
              </p>
            </div>
          ) : null}

          <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="button button--subtle" onClick={onClose}>
              <X size={16} /> Annuler
            </button>
            <button type="submit" className="button" disabled={processing}>
              <CheckCircle size={16} /> {processing ? 'Enregistrement...' : 'Valider le paiement'}
            </button>
            {lastPayment && (
              <>
                <button
                  type="button"
                  className="button button--subtle"
                  onClick={() => {
                    const recordedBy = currentUser ? {
                      name: currentUser.name || currentUser.email?.split('@')[0] || 'Utilisateur',
                      email: currentUser.email,
                    } : null;
                    exportPaymentReceiptPDF({ student, payment: { ...lastPayment, recordedAt: lastPayment.recordedAt || new Date().toISOString() }, recordedBy }, SCHOOL_INFO, { showPrintDialog: false });
                  }}
                >
                  <Eye size={16} /> Voir le reçu
                </button>
                <button
                  type="button"
                  className="button button--subtle"
                  onClick={() => {
                    const recordedBy = currentUser ? {
                      name: currentUser.name || currentUser.email?.split('@')[0] || 'Utilisateur',
                      email: currentUser.email,
                    } : null;
                    exportPaymentReceiptPDF({ student, payment: { ...lastPayment, recordedAt: lastPayment.recordedAt || new Date().toISOString() }, recordedBy }, SCHOOL_INFO);
                  }}
                >
                  <CreditCard size={16} /> Télécharger PDF
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={async () => {
                    try {
                      const recipient = student.contact || '';
                      if (!recipient) {
                        alert('Contact manquant. Impossible d\'envoyer le reçu.');
                        return;
                      }
                      setProcessing(true);
                      setError(null);
                      
                      // Générer l'image du reçu
                      const receiptImage = await generateReceiptImage({ student, payment: lastPayment }, SCHOOL_INFO);
                      
                      // Construire le message
                      const monthsText = (lastPayment.ledger || []).join(', ') || `${lastPayment.monthsCount} mois`;
                      const total = (Number(lastPayment.amountPerMonth || 0) * lastPayment.monthsCount).toLocaleString('fr-FR');
                      const perMonth = Number(lastPayment.amountPerMonth || 0).toLocaleString('fr-FR');
                      const msg = `🎓 *Reçu de Paiement - Abonnement transport*\n\n👤 Étudiant: ${student.name}\n📱 Contact: ${student.contact || 'N/A'}\n📅 Paiement du: ${new Date(lastPayment.paidAt).toLocaleDateString('fr-FR')}\n🗓️ Mois couverts: ${monthsText}\n💵 Montant mensuel: ${perMonth} FCFA\n🧮 Total: ${total} FCFA\n🔖 Référence: ${lastPayment.reference}\n\nMerci pour votre confiance.`;
                      
                      // Envoyer via WhatsApp avec l'image
                      openWhatsAppWithImage(recipient, msg, receiptImage);
                      setSuccessMessage('Reçu envoyé via WhatsApp. L\'image a été téléchargée automatiquement.');
                    } catch (err) {
                      console.error('Erreur envoi reçu WhatsApp:', err);
                      setError('Erreur lors de l\'envoi du reçu. Veuillez réessayer.');
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={processing}
                >
                  <Send size={16} /> Envoyer via WhatsApp
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function buildLedger(paidAtIso, monthsCount) {
  const start = new Date(paidAtIso);
  const y = start.getFullYear();
  const m = start.getMonth();
  const ledger = [];
  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(y, m + i, 1);
    ledger.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return ledger;
}

