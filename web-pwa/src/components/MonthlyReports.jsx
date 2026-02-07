import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, FileDown, BarChart2, FileText } from 'lucide-react';
import { buildMonthlyReport } from '../models/sessions';
import { getSessionIdFromDate, generateSessionList, getSessionLabel } from '../models/sessionCalendar';
import { exportMonthlyReportCSV } from '../services/exportCSV';
import { exportMonthlyReportPDF } from '../services/exportPDF';
import { saveMonthlyReport, fetchMonthlyReports } from '../services/firestoreService';
import { compareSessions, generateCustomReport, exportCustomReport, predictFutureRevenue, generateTrendReport } from '../services/advancedReportsService';

const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.32)',
  backdropFilter: 'blur(4px)',
  display: 'grid',
  placeItems: 'center',
  padding: '1.5rem',
  zIndex: 50,
};

const modalStyle = {
  width: 'min(900px, 100%)',
  background: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 24px 64px rgba(15, 23, 42, 0.22)',
  padding: '1.5rem',
  position: 'relative',
  maxHeight: '85vh',
  overflowY: 'auto',
};

export default function MonthlyReports({ students = [], onClose, open = true, onReSubscribe, lines = [] }) {
  const [sessionId, setSessionId] = useState(() => {
    // Initialiser avec la session actuelle de maniÃ¨re asynchrone
    return null; // Sera mis Ã  jour dans useEffect
  });
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [comparisonSession1, setComparisonSession1] = useState(null);
  const [comparisonSession2, setComparisonSession2] = useState(null);
  const [predictionMonths, setPredictionMonths] = useState(3);
  const [filters, setFilters] = useState({ line: 'all', promo: 'all', classGroup: 'all' });

  const lineOptions = useMemo(() => (Array.isArray(lines) ? lines : []), [lines]);
  const promoOptions = useMemo(() => {
    const values = new Set();
    (students || []).forEach(student => {
      const value = (student?.niveau || student?.promo || '').trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);
  const classOptions = useMemo(() => {
    const values = new Set();
    (students || []).forEach(student => {
      const value = (student?.classGroup || student?.classe || '').trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return (students || []).filter(student => {
      const matchLine = filters.line === 'all' || student?.busLine === filters.line;
      const matchPromo = filters.promo === 'all' || (student?.niveau || student?.promo || '').toLowerCase() === filters.promo.toLowerCase();
      const matchClass = filters.classGroup === 'all' || (student?.classGroup || student?.classe || '').toLowerCase() === filters.classGroup.toLowerCase();
      return matchLine && matchPromo && matchClass;
    });
  }, [students, filters]);

  // Initialiser la session actuelle
  useEffect(() => {
    (async () => {
      try {
        const currentId = await getSessionIdFromDate(new Date());
        setSessionId(currentId);
      } catch (err) {
        console.warn('Erreur initialisation session:', err);
        // Fallback: utiliser la date actuelle
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        setSessionId(`${year}-${month}`);
      }
    })();
  }, []);

  if (!open) return null;

  const { summary, rows } = useMemo(() => {
    if (!sessionId) return { summary: {}, rows: [] };
    return buildMonthlyReport(filteredStudents, sessionId);
  }, [filteredStudents, sessionId]);

  const lineLookup = useMemo(() => Object.fromEntries(lineOptions.map(line => [line.id, line])), [lineOptions]);
  const displayRows = useMemo(() => {
    return (rows || []).map(row => ({
      ...row,
      busLineLabel: lineLookup[row.busLine]?.name || row.busLine || '',
    }));
  }, [rows, lineLookup]);

  const handleExport = () => {
    exportMonthlyReportCSV({ rows: displayRows, summary }, `bilan-${sessionId}.csv`);
  };
  const handleExportPDF = () => {
    exportMonthlyReportPDF({ rows: displayRows, summary }, `Bilan ${sessionId}`);
  };
  const handleArchive = async () => {
    try {
      await saveMonthlyReport({ sessionId, summary, rows });
      setMessage('Bilan archivÃ©.');
      const list = await fetchMonthlyReports(24);
      setHistory(list);
    } catch (err) {
      setMessage(`Erreur archivage: ${err.message}`);
    }
  };

  const [monthsOptions, setMonthsOptions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        // GÃ©nÃ©rer la liste des sessions (mois) disponibles
        const sessions = await generateSessionList(13);
        setMonthsOptions(sessions.map(s => ({
          id: s.id,
          label: s.label, // Ex: "janvier 2025"
        })));
      } catch (err) {
        console.warn('Erreur gÃ©nÃ©ration liste sessions:', err);
        // Fallback: utiliser la date actuelle
        const now = new Date();
        const currentId = await getSessionIdFromDate(now);
        setMonthsOptions([{
          id: currentId,
          label: now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }),
        }]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMonthlyReports(24);
        setHistory(list);
      } catch {}
    })();
  }, []);

  return (
    <div style={backdropStyle}>
      <div style={modalStyle} className="modal-enter">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="section-title"><BarChart2 size={18} /> Bilans mensuels</h3>
          <button className="button button--subtle" onClick={onClose}>Fermer</button>
        </header>
        <div>
          {message ? <p className="subtitle" style={{ color: '#16a34a' }}>{message}</p> : null}
          <div className="toolbar" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            {/* Navigation par mois */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="button button--subtle"
                type="button"
                onClick={async () => {
                  if (!sessionId) return;
                  const currentIndex = monthsOptions.findIndex(m => m.id === sessionId);
                  if (currentIndex > 0) {
                    setSessionId(monthsOptions[currentIndex - 1].id);
                  }
                }}
                disabled={!sessionId || monthsOptions.findIndex(m => m.id === sessionId) === 0}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                â† MOIS PRÃ‰CÃ‰DENT
              </button>
              <label className="input-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
                <Calendar size={16} />
                <select
                  className="input-field"
                  value={sessionId || ''}
                  onChange={e => setSessionId(e.target.value)}
                >
                  {monthsOptions.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </label>
              <button
                className="button button--subtle"
                type="button"
                onClick={async () => {
                  if (!sessionId) return;
                  const currentIndex = monthsOptions.findIndex(m => m.id === sessionId);
                  if (currentIndex < monthsOptions.length - 1) {
                    setSessionId(monthsOptions[currentIndex + 1].id);
                  }
                }}
                disabled={!sessionId || monthsOptions.findIndex(m => m.id === sessionId) === monthsOptions.length - 1}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                MOIS SUIVANT â†’
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="button" type="button" onClick={handleExport}>
                <FileDown size={16} /> TÃ©lÃ©charger CSV
              </button>
              <button className="button" type="button" onClick={handleExportPDF}>
                <FileText size={16} /> TÃ©lÃ©charger PDF
              </button>
              <button className="button button--subtle" type="button" onClick={handleArchive}>
                Archiver le bilan
              </button>
            </div>
          </div>

          <div className="toolbar" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="subtitle" style={{ fontWeight: 600 }}>Filtres :</span>
            <select
              className="input-field"
              value={filters.line}
              onChange={e => setFilters(prev => ({ ...prev, line: e.target.value }))}
            >
              <option value="all">Toutes les lignes</option>
              {lineOptions.map(line => (
                <option key={line.id} value={line.id}>{line.name}</option>
              ))}
            </select>
            <select
              className="input-field"
              value={filters.promo}
              onChange={e => setFilters(prev => ({ ...prev, promo: e.target.value }))}
            >
              <option value="all">Toutes les promos</option>
              {promoOptions.map(promo => (
                <option key={promo} value={promo}>{promo}</option>
              ))}
            </select>
            <select
              className="input-field"
              value={filters.classGroup}
              onChange={e => setFilters(prev => ({ ...prev, classGroup: e.target.value }))}
            >
              <option value="all">Toutes les classes</option>
              {classOptions.map(classe => (
                <option key={classe} value={classe}>{classe}</option>
              ))}
            </select>
            <button
              className="button button--subtle"
              type="button"
              onClick={() => setFilters({ line: 'all', promo: 'all', classGroup: 'all' })}
            >
              RÃ©initialiser filtres
            </button>
          </div>

          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <h4 className="section-title" style={{ marginBottom: '0.5rem' }}>RÃ©sumÃ©</h4>
            <div className="chips" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="chip">Total Ã©tudiants: {summary.totalStudents}</span>
              <span className="chip chip--success">PayÃ©s dans dÃ©lai: {summary.paidOnTime}</span>
              <span className="chip" style={{ background: 'rgba(251, 191, 36, 0.2)', borderColor: 'rgba(251, 191, 36, 0.5)' }}>
                PayÃ©s en grÃ¢ce: {summary.paidInGrace}
              </span>
              {summary.paidInAdvance > 0 && (
                <span className="chip" style={{ background: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.5)', fontWeight: 600 }}>
                  PayÃ©s en avance: {summary.paidInAdvance} ({summary.totalAdvanceMonths || 0} mois)
                </span>
              )}
              <span className="chip">GrÃ¢ce active (impayÃ©s fin mois): {summary.unpaid}</span>
              <span className="chip chip--danger">DÃ©faillants: {summary.defaulters}</span>
              <span className="chip">PayÃ©s hors dÃ©lai: {summary.paidOutOfGrace}</span>
              <span className="chip" style={{ background: '#eef2ff', borderColor: '#c7d2fe', fontWeight: 600 }}>
                Total perÃ§u pour ce mois: {Number(summary.totalAmountForSession || 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            <h4 className="section-title" style={{ marginBottom: '0.5rem' }}>DÃ©tails</h4>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Promo</th>
                    <th>Classe</th>
                    <th>Ligne</th>
                    <th>Statut</th>
                    <th>Date paiement</th>
                    <th>Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map(r => (
                    <tr key={r.studentId} style={r.advanceInfo ? { background: 'rgba(34, 197, 94, 0.05)' } : {}}>
                      <td>{r.name}</td>
                      <td>{r.promo || '-'}</td>
                      <td>{r.classGroup || '-'}</td>
                      <td>{r.busLineLabel || r.busLine}</td>
                      <td>
                        <span style={{ fontWeight: r.advanceInfo ? 600 : 'normal', color: r.advanceInfo ? '#16a34a' : 'inherit' }}>
                          {r.status}
                        </span>
                        {r.advanceInfo && r.advanceInfo.totalAdvanceMonths > 1 && (
                          <small style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Total: {r.advanceInfo.totalAdvanceMonths} mois payÃ©s en avance
                          </small>
                        )}
                      </td>
                      <td>
                        {r.paidAt ? new Date(r.paidAt).toLocaleDateString('fr-FR') : '-'}
                        <button
                          className="button button--subtle"
                          type="button"
                          style={{ marginLeft: '0.5rem' }}
                          onClick={() => onReSubscribe?.(r.studentId)}
                          title="RÃ©abonner"
                        >
                          RÃ©abonner
                        </button>
                      </td>
                      <td>{Number(r.amount || 0).toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rapports AvancÃ©s */}
          <div className="card" style={{ padding: '1rem', marginTop: '1rem', background: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 className="section-title" style={{ margin: 0 }}>Rapports AvancÃ©s</h4>
              <button
                className="button button--subtle"
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                {showAdvanced ? 'Masquer' : 'Afficher'} Rapports AvancÃ©s
              </button>
            </div>
            
            {showAdvanced && (
              <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                {/* Comparaison de sessions */}
                <div className="card" style={{ padding: '1rem', background: 'white' }}>
                  <h5 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Comparaison de Sessions</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <select
                      className="input-field"
                      value={comparisonSession1 || ''}
                      onChange={e => setComparisonSession1(e.target.value)}
                    >
                      <option value="">SÃ©lectionner session 1</option>
                      {monthsOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                    <select
                      className="input-field"
                      value={comparisonSession2 || ''}
                      onChange={e => setComparisonSession2(e.target.value)}
                    >
                      <option value="">SÃ©lectionner session 2</option>
                      {monthsOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {comparisonSession1 && comparisonSession2 && (
                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                      {(() => {
                        const comparison = compareSessions(filteredStudents, comparisonSession1, comparisonSession2);
                        return (
                          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <div><strong>DiffÃ©rence Total Ã©tudiants:</strong> {comparison.comparison.totalStudentsDiff > 0 ? '+' : ''}{comparison.comparison.totalStudentsDiff}</div>
                            <div><strong>DiffÃ©rence PayÃ©s Ã  temps:</strong> {comparison.comparison.paidOnTimeDiff > 0 ? '+' : ''}{comparison.comparison.paidOnTimeDiff}</div>
                            <div><strong>DiffÃ©rence DÃ©faillants:</strong> {comparison.comparison.defaultersDiff > 0 ? '+' : ''}{comparison.comparison.defaultersDiff}</div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* PrÃ©dictions de revenus */}
                <div className="card" style={{ padding: '1rem', background: 'white' }}>
                  <h5 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>PrÃ©dictions de Revenus</h5>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                      Nombre de mois Ã  prÃ©dire:
                      <input
                        className="input-field"
                        type="number"
                        min={1}
                        max={12}
                        value={predictionMonths}
                        onChange={e => setPredictionMonths(Math.max(1, Math.min(12, Number(e.target.value) || 3)))}
                        style={{ width: '100px', marginLeft: '0.5rem' }}
                      />
                    </label>
                  </div>
                  {(() => {
                    const predictions = predictFutureRevenue(filteredStudents, predictionMonths);
                    return (
                      <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                          <strong>Revenu mensuel moyen actuel:</strong> {predictions.currentAverage.toLocaleString('fr-FR')} FCFA
                        </div>
                        <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                          <strong>Ã‰tudiants actifs:</strong> {predictions.currentActiveStudents}
                        </div>
                        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                          <strong>PrÃ©dictions:</strong>
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                            {predictions.predictions.map((p, i) => (
                              <li key={i} style={{ marginBottom: '0.25rem' }}>
                                {p.month}: {p.estimatedRevenue.toLocaleString('fr-FR')} FCFA (estimation)
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
            <h4 className="section-title" style={{ marginBottom: '0.5rem' }}>Historique des bilans archivÃ©s</h4>
            <ul className="list">
              {(history || []).map(item => (
                <li key={item.id} className="list__item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{getSessionLabel(item.sessionId)}</span>
                  <div className="toolbar" style={{ gap: '0.5rem' }}>
                    <button className="button button--subtle" onClick={() => exportMonthlyReportCSV({ rows: item.rows, summary: item.summary }, `bilan-${item.sessionId}.csv`)}>CSV</button>
                    <button className="button button--subtle" onClick={() => exportMonthlyReportPDF({ rows: item.rows, summary: item.summary }, `Bilan ${item.sessionId}`)}>PDF</button>
                  </div>
                </li>
              ))}
              {(!history || history.length === 0) && <li className="list__item">Aucun bilan archivÃ© pour le moment.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

