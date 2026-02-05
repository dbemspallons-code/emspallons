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

/**
 * Génère un reçu en tant qu'image (pour envoi WhatsApp)
 * @returns {Promise<string>} Data URL de l'image du reçu
 */
export async function generateReceiptImage({ student, payment }, school = { name: "Ecole Multinationale Supérieure des Postes d'Abidjan", address: "Abidjan, Côte d'Ivoire", logoUrl: "/images/logos/emsp-logo.png" }) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 1000;
      
      // Fond blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Styles
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px Inter, sans-serif';
      
      // En-tête
      let y = 40;
      ctx.fillText('REÇU DE PAIEMENT', 40, y);
      y += 30;
      
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(school.name, 40, y);
      y += 20;
      ctx.fillText(school.address || '', 40, y);
      y += 30;
      
      const now = new Date();
      ctx.fillText(`Émis le ${now.toLocaleString('fr-FR')}`, 40, y);
      y += 40;
      
      // Ligne de séparation
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(canvas.width - 40, y);
      ctx.stroke();
      y += 30;
      
      // Informations étudiant
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText('Informations', 40, y);
      y += 25;
      
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#475569';
      const ledgerText = (payment.ledger || []).join(', ');
      
      const infoLines = [
        `Étudiant: ${student?.name || ''}`,
        `Contact: ${student?.contact || ''}`,
        `Ligne: ${student?.busLine || ''}`,
      ];
      
      infoLines.forEach(line => {
        ctx.fillText(line, 40, y);
        y += 20;
      });
      
      y += 20;
      
      // Détails paiement
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText('Détails du paiement', 40, y);
      y += 25;
      
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#475569';
      const paymentLines = [
        `Nombre de mois: ${payment.monthsCount}`,
        `Montant mensuel: ${Number(payment.amountPerMonth || 0).toLocaleString('fr-FR')} FCFA`,
        `Total: ${(Number(payment.amountPerMonth || 0) * payment.monthsCount).toLocaleString('fr-FR')} FCFA`,
        `Date de paiement: ${new Date(payment.paidAt).toLocaleDateString('fr-FR')}`,
        `Mois couverts: ${ledgerText}`,
        `Référence: ${payment.reference || ''}`,
      ];
      
      paymentLines.forEach(line => {
        ctx.fillText(line, 40, y);
        y += 20;
      });
      
      // Convertir en image
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Impossible de générer l\'image du reçu'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Erreur lecture image'));
        reader.readAsDataURL(blob);
      }, 'image/png', 1.0);
    } catch (error) {
      reject(error);
    }
  });
}

export function exportPaymentReceiptPDF({ student, payment, recordedBy }, school = { name: "Ecole Multinationale Supérieure des Postes d'Abidjan", address: "Abidjan, Côte d'Ivoire", logoUrl: "/images/logos/emsp-logo.png" }, options = { showPrintDialog: true }) {
  const win = window.open('', '_blank');
  if (!win) return;
  const style = `
    <style>
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; }
      .header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; }
      .header__logo { max-height: 72px; margin-right: 12px; }
      .title { font-size: 18px; font-weight: 700; }
      .meta { color: #475569; font-size: 12px; }
      .section { margin: 10px 0; }
      table { border-collapse: collapse; width: 100%; margin-top: 6px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; }
      th { background: #f1f5f9; text-align: left; }
    </style>
  `;
  const now = new Date();
  const ledgerText = (payment.ledger || []).join(', ');
  const recordedByText = recordedBy?.name || recordedBy?.email || 'Système';
  const recordedAtText = payment.recordedAt ? new Date(payment.recordedAt).toLocaleString('fr-FR') : now.toLocaleString('fr-FR');
  const doc = `
    <div class="header">
      <div style="display:flex; align-items:center; gap:12px;">
        ${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" class="header__logo" alt="Logo EMSP" />` : ''}
        <div>
          <div class="title">Reçu de Paiement</div>
          <div class="meta">${escapeHtml(school.name)}<br/>${escapeHtml(school.address || '')}</div>
        </div>
      </div>
    </div>
    <div class="meta">Émis le ${now.toLocaleString('fr-FR')}</div>
    <div class="section">
      <table>
        <tbody>
          <tr><th>Étudiant</th><td>${escapeHtml(student?.name || '')}</td></tr>
          <tr><th>Contact</th><td>${escapeHtml(student?.contact || '')}</td></tr>
          <tr><th>Ligne</th><td>${escapeHtml(student?.busLine || '')}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="section">
      <table>
        <tbody>
          <tr><th>Nombre de mois</th><td>${payment.monthsCount}</td></tr>
          <tr><th>Montant mensuel</th><td>${Number(payment.amountPerMonth || 0).toLocaleString('fr-FR')} FCFA</td></tr>
          <tr><th>Total</th><td>${(Number(payment.amountPerMonth || 0) * payment.monthsCount).toLocaleString('fr-FR')} FCFA</td></tr>
          <tr><th>Date de paiement</th><td>${new Date(payment.paidAt).toLocaleDateString('fr-FR')}</td></tr>
          <tr><th>Mois couverts</th><td>${escapeHtml(ledgerText)}</td></tr>
          <tr><th>Enregistré par</th><td>${escapeHtml(recordedByText)}</td></tr>
          <tr><th>Date d'enregistrement</th><td>${recordedAtText}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="meta">Référence: ${escapeHtml(payment.reference || '')}</div>
  `;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />${style}<title>Reçu de paiement</title></head><body>${doc}</body></html>`);
  win.document.close();
  if (options.showPrintDialog !== false) {
    setTimeout(() => win.print(), 300);
  }
}

export function exportPausedMonthsAdjustmentPDF({ student, addedSessions = [], removedSessions = [], futureCoverage = [], monthlyAmount = 0 } = {}, school = { name: "Ecole Multinationale Supérieure des Postes d'Abidjan", address: "Abidjan, Côte d'Ivoire", logoUrl: "/images/logos/emsp-logo.png" }) {
  const win = window.open('', '_blank');
  if (!win) return;
  const style = `
    <style>
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0f172a; }
      .header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; }
      .header__logo { max-height: 72px; margin-right: 12px; }
      .title { font-size: 18px; font-weight: 700; }
      .meta { color: #475569; font-size: 12px; }
      .section { margin: 10px 0; }
      ul { margin: 0 0 0 1rem; padding: 0; }
      li { font-size: 12px; margin: 4px 0; }
      table { border-collapse: collapse; width: 100%; margin-top: 6px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px 10px; font-size: 12px; }
      th { background: #f1f5f9; text-align: left; }
    </style>
  `;
  const now = new Date();
  const listItem = (label, values) => {
    if (!values || !values.length) return '';
    return `<li><strong>${escapeHtml(label)} :</strong> ${escapeHtml(values.join(', '))}</li>`;
  };
  const doc = `
    <div class="header">
      <div style="display:flex; align-items:center; gap:12px;">
        ${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" class="header__logo" alt="Logo EMSP" />` : ''}
        <div>
          <div class="title">Reçu Ajusté - Mois en pause</div>
          <div class="meta">${escapeHtml(school.name)}<br/>${escapeHtml(school.address || '')}</div>
        </div>
      </div>
    </div>
    <div class="meta">Émis le ${now.toLocaleString('fr-FR')}</div>
    <div class="section">
      <table>
        <tbody>
          <tr><th>Étudiant</th><td>${escapeHtml(student?.name || '')}</td></tr>
          <tr><th>Contact</th><td>${escapeHtml(student?.contact || '')}</td></tr>
          <tr><th>Ligne</th><td>${escapeHtml(student?.busLine || '')}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="section">
      <p>Suite à la mise à jour des mois en pause, les informations suivantes ont été ajustées :</p>
      <ul>
        ${listItem('Mois désormais en pause', addedSessions)}
        ${listItem('Mois redevenus actifs', removedSessions)}
        ${listItem('Couverture à venir', futureCoverage)}
      </ul>
    </div>
    <div class="section">
      <table>
        <tbody>
          <tr><th>Montant mensuel</th><td>${Number(monthlyAmount || 0).toLocaleString('fr-FR')} FCFA</td></tr>
          <tr><th>Note</th><td>Les mois en pause restent crédités et seront reportés automatiquement à la reprise du service.</td></tr>
        </tbody>
      </table>
    </div>
  `;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />${style}<title>Reçu ajusté</title></head><body>${doc}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}


