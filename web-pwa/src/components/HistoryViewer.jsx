import React, { useEffect, useState, useMemo } from 'react';
import { Download, Clock, Filter } from 'lucide-react';
import { historyService } from '../services/historyService';
import { formatCurrency } from '../utils/payment';

const FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tous les événements' },
  { value: 'PAYMENT', label: 'Paiements' },
  { value: 'SCAN', label: 'Scans' },
  { value: 'STATUS_CHANGE', label: 'Changements de statut' },
  { value: 'QR_GENERATED', label: 'QR générés' },
  { value: 'STUDENT_CREATED', label: 'Étudiants créés' },
  { value: 'USER_MANAGEMENT', label: 'Comptes utilisateurs' },
];

export default function HistoryViewer() {
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [filter, dateRange]);

  async function loadHistory() {
    setLoading(true);
    const entries = await historyService.getAll();
    let filtered = [...entries];

    if (filter !== 'ALL') {
      filtered = filtered.filter(entry => entry.type === filter);
    }

    if (dateRange.start) {
      const from = new Date(dateRange.start).getTime();
      filtered = filtered.filter(entry => entry.timestamp >= from);
    }

    if (dateRange.end) {
      const to = new Date(dateRange.end);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => entry.timestamp <= to.getTime());
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);
    setHistory(filtered);
    setLoading(false);
  }

  function exportHistoryCsv() {
    const rows = [
      ['Date', 'Type', 'Action', 'Entité', 'Utilisateur', 'Détails'],
      ...history.map(entry => [
        new Date(entry.timestamp).toLocaleString('fr-FR'),
        entry.type,
        entry.action,
        entry.entityId,
        entry.userName || '-',
        JSON.stringify(entry.details || {}),
      ]),
    ];
    const csv = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historique_${Date.now()}.csv`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Archives EMSP Allons</h2>
            <p className="text-sm text-gray-500">
              Traçabilité complète des paiements, scans, QR codes et actions système.
            </p>
          </div>
          <button
            onClick={exportHistoryCsv}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex items-center gap-2">
              <Filter className="w-3 h-3" /> Type d'événement
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              {FILTER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Chargement des événements...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-gray-500">Aucun événement enregistré pour le moment.</div>
        ) : (
          <div className="space-y-4">
            {history.map(entry => (
              <HistoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ entry }) {
  const icon = useMemo(() => {
    switch (entry.type) {
      case 'PAYMENT':
        return '💰';
      case 'SCAN':
        return '📸';
      case 'STATUS_CHANGE':
        return '🔄';
      case 'QR_GENERATED':
        return '📱';
      case 'STUDENT_CREATED':
        return '👤';
      case 'USER_MANAGEMENT':
        return '🛡️';
      default:
        return '📝';
    }
  }, [entry.type]);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-slate-50">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              {entry.action.replace(/_/g, ' ')}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-4 h-4" />
              {new Date(entry.timestamp).toLocaleString('fr-FR')}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {renderDetails(entry.details)}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span>Type : {entry.type}</span>
            <span>Entité : {entry.entityId}</span>
            {entry.userName && <span>Par : {entry.userName}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderDetails(details = {}) {
  if (!details || Object.keys(details).length === 0) {
    return <span>Aucun détail supplémentaire.</span>;
  }

  if (details.role && details.email && details.nom) {
    return (
      <div className="space-y-1">
        <div>Profil : <strong>{details.nom}</strong></div>
        <div>Email : <strong>{details.email}</strong></div>
        <div>Rôle : <strong>{details.role === 'admin' ? 'Administrateur' : 'Éducateur'}</strong></div>
        {Array.isArray(details.updatedFields) && details.updatedFields.length > 0 && (
          <div>Champs modifiés : <strong>{details.updatedFields.join(', ')}</strong></div>
        )}
        {details.passwordChanged && (
          <div>Mot de passe réinitialisé</div>
        )}
        {details.createdBy && (
          <div>Créé par : <strong>{details.createdBy}</strong></div>
        )}
      </div>
    );
  }

  if (details.months) {
    return (
      <div className="space-y-1">
        <div>Mois couverts : <strong>{details.months.join(', ')}</strong></div>
        <div>Montant : <strong>{formatCurrency(details.montantTotal)} FCFA</strong></div>
      </div>
    );
  }

  if (details.status && details.validUntil) {
    return (
      <div>
        Statut : <strong>{details.status}</strong> (jusqu'au{' '}
        {new Date(details.validUntil).toLocaleDateString('fr-FR')})
      </div>
    );
  }

  return <pre className="text-xs bg-white p-2 rounded border border-gray-200">{JSON.stringify(details, null, 2)}</pre>;
}

