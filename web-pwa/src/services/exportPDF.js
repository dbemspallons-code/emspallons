export function exportMonthlyReportPDF({ rows, summary }, title = 'Bilan mensuel') {
  // Génère une page imprimable (impression -> Enregistrer en PDF)
  const win = window.open('', '_blank');
  if (!win) return;
  const style = `
    <style>
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; }
      h1, h2 { margin: 0.5rem 0; }
      .meta { margin: 0.5rem 0 1rem; color: #475569; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; }
      th { background: #f1f5f9; text-align: left; }
      .summary { margin: 1rem 0; display: grid; gap: 6px; font-size: 13px; }
    </style>
  `;
  const head = `
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">Session: ${escapeHtml(summary?.sessionId || '')} — Généré le ${new Date().toLocaleString('fr-FR')}</div>
    <div class="summary">
      <div>Total étudiants: ${summary?.totalStudents ?? 0}</div>
      <div>Payés dans délai: ${summary?.paidOnTime ?? 0}</div>
      <div>Payés en grâce: ${summary?.paidInGrace ?? 0}</div>
      <div>Grâce active (impayés fin mois): ${summary?.unpaid ?? 0}</div>
      <div>Défaillants: ${summary?.defaulters ?? 0}</div>
      <div>Payés hors délai: ${summary?.paidOutOfGrace ?? 0}</div>
    </div>
  `;
  const table = `
    <table>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Ligne</th>
          <th>Statut</th>
          <th>Date paiement</th>
          <th>Montant (FCFA)</th>
        </tr>
      </thead>
      <tbody>
        ${(rows || []).map(r => `
          <tr>
            <td>${escapeHtml(r.name || '')}</td>
            <td>${escapeHtml(r.busLine || '')}</td>
            <td>${escapeHtml(r.status || '')}</td>
            <td>${r.paidAt ? new Date(r.paidAt).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${Number(r.amount || 0).toLocaleString('fr-FR')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />${style}<title>${escapeHtml(title)}</title></head><body>${head}${table}</body></html>`);
  win.document.close();
  // Attendre le rendu puis ouvrir la boîte de dialogue d'impression
  setTimeout(() => win.print(), 300);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}
