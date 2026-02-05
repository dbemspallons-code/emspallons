import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Filter, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { fetchScanLogs } from '../services/firestoreService';
import { fetchLines } from '../services/firestoreService';
import { fetchControllers } from '../services/firestoreService';

const SCAN_STATUS_LABELS = {
  approved: 'Autorisé',
  duplicate: 'Déjà scanné',
  expired: 'Expiré',
  fraud: 'Fraude',
  error: 'Erreur',
  WRONG_LINE: 'Mauvaise ligne',
};

export default function ScanHistoryViewer({ onClose }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    line: 'all',
    controller: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [lines, setLines] = useState([]);
  const [controllers, setControllers] = useState([]);
  const [sortBy, setSortBy] = useState('scannedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadScans();
  }, [filters]);

  const loadData = async () => {
    try {
      const [linesData, controllersData] = await Promise.all([
        fetchLines(),
        fetchControllers(),
      ]);
      setLines(linesData);
      setControllers(controllersData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  };

  const loadScans = async () => {
    try {
      setLoading(true);
      const allScans = await fetchScanLogs({ limitCount: 1000 });
      setScans(allScans);
    } catch (error) {
      console.error('Erreur chargement scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScans = useMemo(() => {
    let filtered = [...scans];

    // Filtres
    if (filters.line !== 'all') {
      filtered = filtered.filter(s => s.busLine === filters.line);
    }
    if (filters.controller !== 'all') {
      filtered = filtered.filter(s => s.controllerId === filters.controller);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(s => {
        const scanDate = s.scannedAt?.toDate ? s.scannedAt.toDate() : new Date(s.scannedAt);
        return scanDate >= fromDate;
      });
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => {
        const scanDate = s.scannedAt?.toDate ? s.scannedAt.toDate() : new Date(s.scannedAt);
        return scanDate <= toDate;
      });
    }

    // Tri
    filtered.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'scannedAt') {
        aVal = a.scannedAt?.toDate ? a.scannedAt.toDate().getTime() : new Date(a.scannedAt || 0).getTime();
        bVal = b.scannedAt?.toDate ? b.scannedAt.toDate().getTime() : new Date(b.scannedAt || 0).getTime();
      } else {
        aVal = a[sortBy] || '';
        bVal = b[sortBy] || '';
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [scans, filters, sortBy, sortOrder]);

  const paginatedScans = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredScans.slice(start, start + itemsPerPage);
  }, [filteredScans, currentPage]);

  const statistics = useMemo(() => {
    const total = filteredScans.length;
    const byStatus = {};
    const byLine = {};
    const byController = {};
    let approvedCount = 0;

    filteredScans.forEach(scan => {
      byStatus[scan.status] = (byStatus[scan.status] || 0) + 1;
      byLine[scan.busLine] = (byLine[scan.busLine] || 0) + 1;
      byController[scan.controllerId] = (byController[scan.controllerId] || 0) + 1;
      if (scan.status === 'approved') approvedCount++;
    });

    const mostActiveController = Object.entries(byController)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      approvedCount,
      refusalRate: total > 0 ? ((total - approvedCount) / total * 100).toFixed(1) : 0,
      byStatus,
      byLine,
      mostActiveController: mostActiveController ? {
        id: mostActiveController[0],
        count: mostActiveController[1],
      } : null,
    };
  }, [filteredScans]);

  const handleExport = () => {
    const csv = [
      ['Date', 'Étudiant', 'Ligne', 'Contrôleur', 'Statut', 'Raison'].join(','),
      ...paginatedScans.map(scan => {
        const date = scan.scannedAt?.toDate ? scan.scannedAt.toDate().toLocaleString('fr-FR') : new Date(scan.scannedAt || 0).toLocaleString('fr-FR');
        return [
          date,
          scan.studentName || 'N/A',
          lines.find(l => l.id === scan.busLine)?.name || scan.busLine || 'N/A',
          scan.controllerName || 'N/A',
          SCAN_STATUS_LABELS[scan.status] || scan.status,
          scan.reason || '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scans_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp && timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else {
        return 'Date invalide';
      }
      
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn('Erreur formatage date:', error, timestamp);
      return 'Date invalide';
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
      <div className="card modal-enter" style={{ maxWidth: '1200px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--info" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <TrendingUp size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Historique des scans</h2>
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

        {/* Statistiques */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Total scans</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 600 }}>{statistics.total}</p>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Autorisés</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 600, color: '#10b981' }}>{statistics.approvedCount}</p>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Taux de refus</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>{statistics.refusalRate}%</p>
          </div>
          {statistics.mostActiveController && (
            <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Contrôleur actif</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', fontWeight: 600 }}>
                {controllers.find(c => c.id === statistics.mostActiveController.id)?.name || 'N/A'}
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                {statistics.mostActiveController.count} scans
              </p>
            </div>
          )}
        </div>

        {/* Filtres */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              <Filter size={14} /> Ligne
            </label>
            <select
              className="input-field"
              value={filters.line}
              onChange={(e) => setFilters(prev => ({ ...prev, line: e.target.value }))}
            >
              <option value="all">Toutes les lignes</option>
              {lines.map(line => (
                <option key={line.id} value={line.id}>{line.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              Contrôleur
            </label>
            <select
              className="input-field"
              value={filters.controller}
              onChange={(e) => setFilters(prev => ({ ...prev, controller: e.target.value }))}
            >
              <option value="all">Tous les contrôleurs</option>
              {controllers.map(controller => (
                <option key={controller.id} value={controller.id}>{controller.name}</option>
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
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(SCAN_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              <Calendar size={14} /> Du
            </label>
            <input
              className="input-field"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
              Au
            </label>
            <input
              className="input-field"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
            {filteredScans.length} scan(s) trouvé(s)
          </p>
          <button
            className="button button--subtle"
            type="button"
            onClick={handleExport}
            disabled={paginatedScans.length === 0}
          >
            <Download size={16} /> Exporter CSV
          </button>
        </div>

        {/* Tableau */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Chargement...</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                        onClick={() => {
                          if (sortBy === 'scannedAt') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('scannedAt');
                            setSortOrder('desc');
                          }
                        }}>
                      Date {sortBy === 'scannedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Étudiant</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Ligne</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Contrôleur</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                        onClick={() => {
                          if (sortBy === 'status') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('status');
                            setSortOrder('desc');
                          }
                        }}>
                      Statut {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem' }}>Raison</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedScans.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        Aucun scan trouvé
                      </td>
                    </tr>
                  ) : (
                    paginatedScans.map((scan, idx) => {
                      const statusColor = scan.status === 'approved' ? '#10b981' : 
                                         scan.status === 'expired' || scan.status === 'error' || scan.status === 'WRONG_LINE' ? '#ef4444' : 
                                         '#f59e0b';
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{formatDate(scan.scannedAt)}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{scan.studentName || 'N/A'}</td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                            {lines.find(l => l.id === scan.busLine)?.name || scan.busLine || 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{scan.controllerName || scan.driverId || 'N/A'}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span className="chip" style={{ 
                              background: statusColor, 
                              color: 'white',
                              fontSize: '0.75rem'
                            }}>
                              {SCAN_STATUS_LABELS[scan.status] || scan.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                            {scan.reason || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {Math.ceil(filteredScans.length / itemsPerPage) > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  className="button button--subtle"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </button>
                <span style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                  Page {currentPage} / {Math.ceil(filteredScans.length / itemsPerPage)}
                </span>
                <button
                  className="button button--subtle"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredScans.length / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(filteredScans.length / itemsPerPage)}
                >
                  Suivant
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

