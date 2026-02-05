/**
 * Exporte des étudiants en CSV avec colonnes personnalisables
 * @param {Array} subscribers - Liste des étudiants
 * @param {string} filename - Nom du fichier
 * @param {Array} selectedColumns - Colonnes à exporter (optionnel, toutes par défaut)
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
  
  // Utiliser les colonnes sélectionnées ou toutes par défaut
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
      .join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMonthlyReportCSV({ rows, summary }, filename = 'bilan-mensuel.csv') {
  const headers = ['studentId', 'name', 'busLine', 'status', 'paidAt', 'amount'];
  const head = headers.join(',');
  const body = (rows || []).map(r =>
    headers
      .map(h => JSON.stringify(r[h] ?? ''))
      .join(','),
  );
  const meta = [
    '',
    `# Session: ${summary?.sessionId || ''}`,
    `# Total étudiants: ${summary?.totalStudents ?? 0}`,
    `# Payés dans délai: ${summary?.paidOnTime ?? 0}`,
    `# Payés en grâce: ${summary?.paidInGrace ?? 0}`,
    `# Impayés fin mois (grâce active): ${summary?.unpaid ?? 0}`,
    `# Défaillants: ${summary?.defaulters ?? 0}`,
    `# Payés hors délai: ${summary?.paidOutOfGrace ?? 0}`,
    `# Total perçu pour ce mois (FCFA): ${Number(summary?.totalAmountForSession || 0)}`,
  ];
  const csv = [head, ...body, ...meta].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}