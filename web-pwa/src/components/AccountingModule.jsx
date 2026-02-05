import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, FileText, TrendingUp, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { fetchPaymentsByMonth, fetchStudents } from '../services/firestoreService';
import { computeSubscriptionStatus } from '../models/entities';

export default function AccountingModule({ students = [], lines = [], onClose }) {
  const [activeTab, setActiveTab] = useState('monthly'); // monthly, overdue, projections, exports
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'monthly') {
      loadMonthlyPayments();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  const loadMonthlyPayments = async () => {
    try {
      setLoading(true);
      const paymentsData = await fetchPaymentsByMonth(selectedYear, selectedMonth);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthlyStats = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + (p.montantTotal || 0), 0);
    const byLine = {};
    const byMethod = {};
    
    payments.forEach(payment => {
      const student = students.find(s => s.id === payment.studentId);
      const lineId = student?.busLine || 'unknown';
      byLine[lineId] = (byLine[lineId] || 0) + (payment.montantTotal || 0);
      const method = payment.paymentMethod || payment.method || 'unknown';
      byMethod[method] = (byMethod[method] || 0) + (payment.montantTotal || 0);
    });

    // Comparaison avec mois précédent
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    // Note: Pour une vraie comparaison, il faudrait charger les paiements du mois précédent
    const prevTotal = 0; // À implémenter si nécessaire

    return {
      totalCollected,
      byLine,
      byMethod,
      paymentCount: payments.length,
      prevTotal,
      evolution: prevTotal > 0 ? (((totalCollected - prevTotal) / prevTotal) * 100).toFixed(1) : '0',
    };
  }, [payments, students, selectedMonth, selectedYear]);

  const overdueStudents = useMemo(() => {
    return students
      .map(student => {
        const status = computeSubscriptionStatus(student);
        if (status.status === 'EXPIRÉ' || status.status === 'EN RETARD') {
          const monthsOverdue = status.daysRemaining < 0 ? Math.ceil(Math.abs(status.daysRemaining) / 30) : 0;
          return {
            ...student,
            status,
            monthsOverdue,
            amountDue: (student.monthlyFee || 0) * Math.max(1, monthsOverdue),
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.amountDue - a.amountDue);
  }, [students]);

  const overdueByLine = useMemo(() => {
    const byLine = {};
    overdueStudents.forEach(student => {
      const lineId = student.busLine || 'unknown';
      if (!byLine[lineId]) {
        byLine[lineId] = { count: 0, total: 0, students: [] };
      }
      byLine[lineId].count++;
      byLine[lineId].total += student.amountDue;
      byLine[lineId].students.push(student);
    });
    return byLine;
  }, [overdueStudents]);

  const projections = useMemo(() => {
    const activeStudents = students.filter(s => {
      const status = computeSubscriptionStatus(s);
      return status.status === 'ACTIF';
    });
    
    const expectedRevenue = activeStudents.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
    const currentMonth = new Date().getMonth() + 1;
    const monthsRemaining = 12 - currentMonth + 1;
    const yearProjection = expectedRevenue * monthsRemaining;

    return {
      activeCount: activeStudents.length,
      expectedRevenue,
      yearProjection,
      monthsRemaining,
    };
  }, [students]);

  const handleExportPDF = () => {
    // TODO: Implémenter export PDF
    alert('Export PDF à implémenter');
  };

  const handleExportExcel = () => {
      const csv = [
      ['Date', 'Étudiant', 'Montant', 'Méthode', 'Mois couverts'].join(','),
      ...payments.map(p => {
        const student = students.find(s => s.id === p.studentId);
        const date = p.dateEnregistrement ? new Date(p.dateEnregistrement).toLocaleDateString('fr-FR') : 'N/A';
        return [
          date,
          student?.name || 'N/A',
          p.montantTotal || 0,
          p.paymentMethod || p.method || 'N/A',
          p.nombreMois || 0,
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `comptabilite_${selectedYear}_${selectedMonth}.csv`;
    link.click();
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
      <div className="card modal-enter" style={{ maxWidth: '1200px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--success" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <DollarSign size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Module de Comptabilité</h2>
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
            className={`button ${activeTab === 'monthly' ? '' : 'button--subtle'}`}
            type="button"
            onClick={() => setActiveTab('monthly')}
            style={{ borderBottom: activeTab === 'monthly' ? '2px solid #2563eb' : 'none', borderRadius: 0 }}
          >
            <Calendar size={16} /> Vue Mensuelle
          </button>
          <button
            className={`button ${activeTab === 'overdue' ? '' : 'button--subtle'}`}
            type="button"
            onClick={() => setActiveTab('overdue')}
            style={{ borderBottom: activeTab === 'overdue' ? '2px solid #2563eb' : 'none', borderRadius: 0 }}
          >
            <AlertCircle size={16} /> Retards
          </button>
          <button
            className={`button ${activeTab === 'projections' ? '' : 'button--subtle'}`}
            type="button"
            onClick={() => setActiveTab('projections')}
            style={{ borderBottom: activeTab === 'projections' ? '2px solid #2563eb' : 'none', borderRadius: 0 }}
          >
            <TrendingUp size={16} /> Projections
          </button>
          <button
            className={`button ${activeTab === 'exports' ? '' : 'button--subtle'}`}
            type="button"
            onClick={() => setActiveTab('exports')}
            style={{ borderBottom: activeTab === 'exports' ? '2px solid #2563eb' : 'none', borderRadius: 0 }}
          >
            <Download size={16} /> Exports
          </button>
        </div>

        {activeTab === 'monthly' && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
              <select
                className="input-field"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                style={{ width: '150px' }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                className="input-field"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                style={{ width: '120px' }}
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Statistiques */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Total encaissé</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 600, color: '#10b981' }}>
                  {monthlyStats.totalCollected.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Nombre de paiements</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 600 }}>
                  {monthlyStats.paymentCount}
                </p>
              </div>
              {monthlyStats.evolution !== '0' && (
                <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Évolution</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 600, color: monthlyStats.evolution.startsWith('-') ? '#ef4444' : '#10b981' }}>
                    {monthlyStats.evolution.startsWith('-') ? '' : '+'}{monthlyStats.evolution}%
                  </p>
                </div>
              )}
            </div>

            {/* Par ligne */}
            {Object.keys(monthlyStats.byLine).length > 0 && (
              <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#f8fafc' }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Revenus par ligne</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {Object.entries(monthlyStats.byLine).map(([lineId, amount]) => {
                    const line = lines.find(l => l.id === lineId);
                    return (
                      <div key={lineId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '6px' }}>
                        <span style={{ fontWeight: 600 }}>{line?.name || lineId}</span>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>{amount.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Liste des paiements */}
            <div>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Paiements du mois</h4>
              {loading ? (
                <p>Chargement...</p>
              ) : payments.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Aucun paiement pour ce mois</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Date</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Étudiant</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Montant</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Méthode</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Mois</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, idx) => {
                        const student = students.find(s => s.id === payment.studentId);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                              {payment.dateEnregistrement ? new Date(payment.dateEnregistrement).toLocaleDateString('fr-FR') : 'N/A'}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{student?.name || 'N/A'}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
                              {(payment.montantTotal || 0).toLocaleString('fr-FR')} FCFA
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{payment.paymentMethod || payment.method || 'N/A'}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{payment.nombreMois || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overdue' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Total impayés</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>
                  {overdueStudents.reduce((sum, s) => sum + s.amountDue, 0).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Étudiants en retard</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 600 }}>
                  {overdueStudents.length}
                </p>
              </div>
            </div>

            {/* Par ligne */}
            {Object.keys(overdueByLine).length > 0 && (
              <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', background: '#f8fafc' }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Impayés par ligne</h4>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {Object.entries(overdueByLine).map(([lineId, data]) => {
                    const line = lines.find(l => l.id === lineId);
                    return (
                      <div key={lineId} style={{ padding: '0.75rem', background: 'white', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 600 }}>{line?.name || lineId}</span>
                          <span style={{ fontWeight: 600, color: '#ef4444' }}>{data.total.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{data.count} étudiant(s)</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Liste des étudiants en retard */}
            <div>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Liste des retards</h4>
              {overdueStudents.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Aucun retard de paiement</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Étudiant</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Ligne</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Mois en retard</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Montant dû</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueStudents.map((student, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{student.name}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                            {lines.find(l => l.id === student.busLine)?.name || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{student.monthsOverdue}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                            {student.amountDue.toLocaleString('fr-FR')} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'projections' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Abonnés actifs</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 600 }}>{projections.activeCount}</p>
              </div>
              <div className="card" style={{ padding: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Revenus attendus ce mois</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 600, color: '#10b981' }}>
                  {projections.expectedRevenue.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="card" style={{ padding: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Prévision fin d'année</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 600, color: '#2563eb' }}>
                  {projections.yearProjection.toLocaleString('fr-FR')} FCFA
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  ({projections.monthsRemaining} mois restants)
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exports' && (
          <div>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Exports disponibles</h4>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <button
                className="button"
                type="button"
                onClick={handleExportExcel}
                disabled={payments.length === 0}
              >
                <Download size={16} /> Exporter Excel (CSV) - Paiements {selectedMonth}/{selectedYear}
              </button>
              <button
                className="button button--subtle"
                type="button"
                onClick={handleExportPDF}
              >
                <FileText size={16} /> Exporter PDF - Rapport mensuel (À implémenter)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

