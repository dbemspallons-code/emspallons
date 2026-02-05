import React, { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { PhoneCall, Trash2, DownloadCloud, MessageCircle, CheckCircle2, ShieldX, RefreshCcw, CreditCard, Download, Edit2 } from 'lucide-react';
import { PAYMENT_STATUS, SUBSCRIPTION_PLANS } from '../models/entities';
import { getMonthNameFromSessionId, getMonthNamesFromSessionIds } from '../models/sessionCalendar';

/**
 * Identifie les mois payés en avance pour un étudiant
 */
function getAdvanceMonths(student) {
  if (!student?.monthsLedger || !Array.isArray(student.monthsLedger)) {
    return [];
  }
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based
  const advanceMonths = [];
  
  for (const sessionId of student.monthsLedger) {
    const [sessionYear, sessionMonth] = sessionId.split('-').map(Number);
    const isFuture = sessionYear > currentYear || (sessionYear === currentYear && sessionMonth > currentMonth);
    
    if (isFuture) {
      let monthsAhead = 0;
      if (sessionYear > currentYear) {
        monthsAhead = (sessionYear - currentYear) * 12 + (sessionMonth - currentMonth);
      } else {
        monthsAhead = sessionMonth - currentMonth;
      }
      advanceMonths.push({ sessionId, monthsAhead });
    }
  }
  
  return advanceMonths.sort((a, b) => a.monthsAhead - b.monthsAhead);
}

export default function StudentList({
  students,
  onSendWhatsApp,
  onSendReceiptWhatsApp,
  onExportPass,
  onReSubscribe,
  onDelete,
  onTogglePayment,
  onRefreshPass,
  onRevokePass,
  onRegisterPayment,
  onDownloadQR,
  onEdit,
  lines = [],
  plans = SUBSCRIPTION_PLANS,
  processingPassId,
}) {
  const lineLookup = useMemo(() => Object.fromEntries(lines.map(line => [line.id, line])), [lines]);
  const planLookup = useMemo(() => Object.fromEntries(plans.map(plan => [plan.id, plan])), [plans]);
  
  if (!students?.length) {
    return (
      <div className="card list-empty">
        <MessageCircle size={38} strokeWidth={1.4} />
        <div>
          <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Aucun étudiant pour le moment</p>
          <p className="subtitle">Ajoutez un étudiant pour commencer la gestion du transport.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-grid layout-grid--balanced fade-in scroll-reveal">
      {students.map((student, index) => {
        const statusClass = buildStatusClass(student.paymentStatus);
        const line = lineLookup[student.busLine];
        const plan = planLookup[student.subscriptionPlan] || { label: student.subscriptionPlan };
        
        // Calculer le statut basé sur subscriptionExpiresAt (nouvelle structure)
        const expirationDate = student.subscriptionExpiresAt ? new Date(student.subscriptionExpiresAt) : (student.subscription?.expiresAt ? new Date(student.subscription.expiresAt) : null);
        const now = new Date();
        const expiration = expirationDate;
        const formattedExpiration = expiration ? expiration.toLocaleDateString('fr-FR') : 'Non défini';
        
        // Calculer le statut avec badge coloré
        let statusBadge = null;
        if (expiration) {
          const daysUntilExpiration = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilExpiration > 15) {
            // Vert : Payé jusqu'à [date]
            statusBadge = { color: '#22c55e', text: `Payé jusqu'au ${formattedExpiration}`, bg: '#dcfce7' };
          } else if (daysUntilExpiration > 0) {
            // Orange : Expire le [date]
            statusBadge = { color: '#f97316', text: `Expire le ${formattedExpiration}`, bg: '#ffedd5' };
          } else {
            // Rouge : Expiré depuis le [date]
            const daysExpired = Math.abs(daysUntilExpiration);
            statusBadge = { color: '#dc2626', text: `Expiré depuis ${daysExpired} jour${daysExpired > 1 ? 's' : ''}`, bg: '#fee2e2' };
          }
        } else {
          statusBadge = { color: '#64748b', text: 'Aucun abonnement', bg: '#f1f5f9' };
        }
        
        const isExpired = expiration ? expiration.getTime() < Date.now() : false;

        return (
          <article key={student.id} className="card stagger-item fade-in" style={{ overflow: 'hidden', animationDelay: `${index * 0.05}s` }}>
            <div className={statusClass} />
            <div style={{ padding: '1.3rem' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{student.name}</h3>
                  <p className="subtitle" style={{ marginTop: '0.2rem' }}>{line?.name || 'Ligne non renseignée'}</p>
                </div>
                <div className="chips">
                  {student.niveau ? <span className="chip chip--primary">{student.niveau}</span> : null}
                  {student.classGroup ? <span className="chip chip--primary">{student.classGroup}</span> : null}
                  {statusBadge ? (
                    <span 
                      className="badge" 
                      style={{ 
                        background: statusBadge.bg, 
                        color: statusBadge.color, 
                        border: `1px solid ${statusBadge.color}40`,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}
                    >
                      <CheckCircle2 size={14} /> {statusBadge.text}
                    </span>
                  ) : (
                    <span className={`badge ${badgeClass(student.paymentStatus)}`}>
                      <CheckCircle2 size={14} /> {statusLabel(student.paymentStatus)}
                    </span>
                  )}
                </div>
              </header>

              <div className="divider" style={{ margin: '1rem 0' }} />

              <section className="layout-grid" style={{ gap: '0.75rem' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#475569', textTransform: 'uppercase' }}>Contact</strong>
                  <p style={{ margin: '0.2rem 0', fontWeight: 600 }}>{student.contact || 'N/A'}</p>
                  {student.guardian ? <p className="subtitle">Parent : {student.guardian}</p> : null}
                  {student.pickupPoint ? <p className="subtitle">Ramassage : {student.pickupPoint}</p> : null}
                </div>
                <div className="qr-wrapper" style={{ position: 'relative', minHeight: '112px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!student.qrCode?.token ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '112px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: 'white', fontSize: '0.7rem', fontWeight: 600 }}>
                        QR code non généré
                        <br />
                        <button
                          className="button"
                          type="button"
                          onClick={() => onRefreshPass?.(student)}
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.65rem'
                          }}
                        >
                          Générer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div id={`qr-container-${student.id}`}>
                        <QRCodeCanvas 
                          value={encodeQRCodePayload(student)} 
                          size={112}
                        />
                      </div>
                      <button
                        className="button button--subtle"
                        type="button"
                        onClick={() => onDownloadQR?.(student, `qr-container-${student.id}`)}
                        style={{
                          position: 'absolute',
                          bottom: '0.5rem',
                          right: '0.5rem',
                          padding: '0.35rem',
                          fontSize: '0.75rem',
                          minWidth: 'auto'
                        }}
                        title="Télécharger le QR code"
                      >
                        <Download size={14} />
                      </button>
                    </>
                  )}
                </div>
              </section>

              <section style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                <div className="chips">
                  <span className="chip">{plan.label}</span>
                  {typeof student.monthlyFee === 'number' && student.monthlyFee > 0 ? (
                    <span className="chip">{student.monthlyFee.toLocaleString('fr-FR')} FCFA</span>
                  ) : null}
                  <span className="chip">Payé: {student.subscription?.monthsPaidCount ?? student.monthsPaid?.length ?? 0} mois</span>
                  <span className={`chip ${isExpired ? 'chip--danger' : ''}`}>Expire: {formattedExpiration}</span>
                </div>
                {student.notes ? (
                  <p className="subtitle" style={{ fontStyle: 'italic' }}>“{student.notes}”</p>
                ) : null}
              </section>

              <footer className="toolbar" style={{ marginTop: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                {onEdit && (
                  <button className="button button--subtle" type="button" onClick={() => onEdit(student)}>
                    <Edit2 size={16} /> Modifier
                  </button>
                )}
                <button className="button button--subtle" type="button" onClick={() => onTogglePayment?.(student)}>
                  <CheckCircle2 size={16} /> Mettre à jour le statut
                </button>
                <button className="button" type="button" onClick={() => onSendWhatsApp?.(student)}>
                  <PhoneCall size={16} /> WhatsApp
                </button>
                <button className="button button--subtle" type="button" onClick={() => onSendReceiptWhatsApp?.(student)}>
                  <PhoneCall size={16} /> Envoyer reçu
                </button>
                <button className="button button--subtle" type="button" onClick={() => onExportPass?.(student)}>
                  <DownloadCloud size={16} /> Pass
                </button>
                <button className="button button--subtle" type="button" onClick={() => onRegisterPayment?.(student)}>
                  <CreditCard size={16} /> Paiement
                </button>
              <button className="button button--subtle" type="button" onClick={() => onReSubscribe?.(student)}>
                <CreditCard size={16} /> Réabonner
              </button>
                <button
                  className="button button--subtle"
                  type="button"
                  disabled={processingPassId === student.id}
                  onClick={() => onRefreshPass?.(student)}
                >
                  <RefreshCcw size={16} /> {processingPassId === student.id ? 'Génération...' : 'Régénérer QR'}
                </button>
                <button className="button button--subtle" type="button" onClick={() => onRevokePass?.(student)}>
                  <ShieldX size={16} /> Révoquer
                </button>
                <button className="button button--danger" type="button" onClick={() => onDelete?.(student)}>
                  <Trash2 size={16} /> Supprimer
                </button>
                <details style={{ width: '100%', marginTop: '0.5rem' }}>
                  <summary style={{ cursor: 'pointer' }}>Historique & Mois payés</summary>
                  <div className="card" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
                    {(() => {
                      const advanceMonths = getAdvanceMonths(student);
                      const hasAdvancePayments = advanceMonths.length > 0;
                      return (
                        <>
                          <p className="subtitle" style={{ marginBottom: '0.5rem' }}>
                            Mois payés: {getMonthNamesFromSessionIds(student.monthsLedger || [])}
                            {hasAdvancePayments && (
                              <span style={{ 
                                marginLeft: '0.5rem', 
                                fontSize: '0.85rem', 
                                color: '#16a34a', 
                                fontWeight: 600,
                                background: 'rgba(34, 197, 94, 0.15)',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                display: 'inline-block'
                              }}>
                                ⏩ {advanceMonths.length} mois payés en avance
                              </span>
                            )}
                          </p>
                          <div className="table-wrapper">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Nb mois</th>
                                  <th>Date paiement</th>
                                  <th>Mois (session)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(student.monthsPaid || []).map((p, idx) => {
                                  const isAdvance = advanceMonths.some(am => am.sessionId === p.sessionId);
                                  const advanceInfo = advanceMonths.find(am => am.sessionId === p.sessionId);
                                  return (
                                    <tr key={`${student.id}-p-${idx}`} style={isAdvance ? { background: 'rgba(34, 197, 94, 0.08)' } : {}}>
                                      <td>{p.monthCount}</td>
                                      <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-FR') : '-'}</td>
                                      <td>
                                        {p.sessionId ? (
                                          <span>
                                            {getMonthNameFromSessionId(p.sessionId)}
                                            {isAdvance && (
                                              <span style={{ 
                                                marginLeft: '0.5rem', 
                                                fontSize: '0.75rem', 
                                                color: '#16a34a', 
                                                fontWeight: 600,
                                                background: 'rgba(34, 197, 94, 0.15)',
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '4px'
                                              }}>
                                                ⏩ {advanceInfo.monthsAhead} mois en avance
                                              </span>
                                            )}
                                          </span>
                                        ) : '-'}
                                      </td>
                                    </tr>
                                  );
                                })}
                                {(!student.monthsPaid || student.monthsPaid.length === 0) && (
                                  <tr><td colSpan={3}>Aucun paiement enregistré</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </details>
              </footer>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function buildStatusClass(status) {
  switch (status) {
    case PAYMENT_STATUS.UP_TO_DATE:
      return 'status-strip status-strip--success';
    case PAYMENT_STATUS.LATE:
      return 'status-strip status-strip--warning';
    case PAYMENT_STATUS.OUT_OF_SERVICE:
    case 'expired':
      return 'status-strip status-strip--danger';
    default:
      return 'status-strip';
  }
}

function badgeClass(status) {
  switch (status) {
    case PAYMENT_STATUS.UP_TO_DATE:
      return 'badge--success';
    case PAYMENT_STATUS.LATE:
      return 'badge--warning';
    case PAYMENT_STATUS.OUT_OF_SERVICE:
      return 'badge--danger';
    default:
      return '';
  }
}

function statusLabel(status) {
  switch (status) {
    case PAYMENT_STATUS.UP_TO_DATE:
      return 'À jour';
    case PAYMENT_STATUS.LATE:
      return 'Retard';
    case PAYMENT_STATUS.OUT_OF_SERVICE:
      return 'Suspendu';
    default:
      return 'Nouveau';
  }
}

function encodeQRCodePayload(student) {
  // Utiliser le token sécurisé s'il existe
  if (student.qrCode?.token) {
    return student.qrCode.token;
  }
  
  // Fallback : générer un payload simple (pour compatibilité)
  // Note: Ce format ne fonctionnera pas avec le scanner sécurisé
  const payload = {
    id: student.id,
    name: student.name,
    busLine: student.busLine,
    classGroup: student.classGroup,
    guardian: student.guardian,
  };

  try {
    return btoa(JSON.stringify(payload));
  } catch (error) {
    console.warn('QR encode failed', error);
    return 'N/A';
  }
}

