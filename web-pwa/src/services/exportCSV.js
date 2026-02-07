/**
 * Exporte des etudiants en CSV avec colonnes personnalisables
 * @param {Array} subscribers - Liste des etudiants
 * @param {string} filename - Nom du fichier
 * @param {Array} selectedColumns - Colonnes a exporter (optionnel, toutes par defaut)
 */
export function exportSubscribersCSV(subscribers, filename = 'students.csv', selectedColumns = null) {
  if (!Array.isArray(subscribers)) subscribers = [];
  
  const allHeaders = [
    'id',
    'name',
    'contact',
    'classGroup',
    'busLine',
    'guardian',
    'pickupPoint',
    'subscriptionPlan',
    'monthlyFee',
    'paymentStatus',
    'monthsPaid',
    'monthsLedger',
    'createdAt',
    'updatedAt',
  ];
  
  // Utiliser les colonnes selectionnees ou toutes par defaut
  const headers = selectedColumns && Array.isArray(selectedColumns) && selectedColumns.length > 0
    ? allHeaders.filter(h => selectedColumns.includes(h))
    : allHeaders;
  
  const rows = subscribers.map(subscriber =>
    headers
      .map(header => {
        if (header === 'monthsPaid') {
          return JSON.stringify((subscriber.monthsPaid || []).map(p => p.sessionId || p).join('|'));
        }
        if (header === 'monthsLedger') {
          return JSON.stringify((subscriber.monthsLedger || []).join('|'));
        }
        if (header === 'monthlyFee') {
          return JSON.stringify(subscriber.monthlyFee ?? 0);
        }
        if (header === 'createdAt' || header === 'updatedAt') {
          const date = subscriber.audit?.[header === 'createdAt' ? 'createdAt' : 'updatedAt'];
          return date ? JSON.stringify(new Date(date).toLocaleDateString('fr-FR')) : '';
        }
        return JSON.stringify(subscriber[header] ?? '');
      })
      .join(';'),
  );
  const csv = [headers.join(';'), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMonthlyReportCSV({ rows, summary }, filename = 'bilan-mensuel.csv') {
  const headers = ['studentId', 'name', 'promo', 'classGroup', 'busLine', 'status', 'paidAt', 'amount'];
  const head = headers.join(';');
  const body = (rows || []).map(r =>
    headers
      .map(h => {
        if (h === 'busLine') {
          return JSON.stringify(r.busLineLabel ?? r.busLine ?? '');
        }
        return JSON.stringify(r[h] ?? '');
      })
      .join(';'),
  );
  const meta = [
    '',
    `# Session: ${summary?.sessionId || ''}`,
    `# Total etudiants: ${summary?.totalStudents ?? 0}`,
    `# Payes dans delai: ${summary?.paidOnTime ?? 0}`,
    `# Payes en grace: ${summary?.paidInGrace ?? 0}`,
    `# Impayes fin mois (grace active): ${summary?.unpaid ?? 0}`,
    `# Defaillants: ${summary?.defaulters ?? 0}`,
    `# Payes hors delai: ${summary?.paidOutOfGrace ?? 0}`,
    `# Total percu pour ce mois (FCFA): ${Number(summary?.totalAmountForSession || 0)}`,
  ];
  const csv = [head, ...body, ...meta].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

