/**
 * Service de génération de reçus PDF professionnels
 * Supprime complètement le système QR code
 */

import { PAYMENT_CONFIG } from '../constants/payment';

const SCHOOL_INFO = {
  name: "Ecole Multinationale Supérieure des Postes d'Abidjan",
  address: "Abidjan, Côte d'Ivoire",
  logoUrl: "/images/logos/emsp-logo.png",
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}

function formatDate(dateIso) {
  if (!dateIso) return '';
  const date = new Date(dateIso);
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
}

function formatDateShort(dateIso) {
  if (!dateIso) return '';
  const date = new Date(dateIso);
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

/**
 * Génère un numéro de reçu unique
 */
function generateReceiptNumber(paymentId) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const shortId = paymentId.split('_').pop().substr(0, 6).toUpperCase();
  return `REC-${year}${month}${day}-${shortId}`;
}

/**
 * Génère un reçu PDF professionnel
 */
export function generateReceiptPDF({ student, payment }, school = SCHOOL_INFO) {
  const win = window.open('', '_blank');
  if (!win) return;

  const receiptNumber = generateReceiptNumber(payment.id);
  const datePaiement = formatDate(payment.dateEnregistrement);
  const periodeDebut = formatDate(payment.moisDebut);
  const periodeFin = formatDate(payment.moisFin);
  const dateGraceFin = formatDate(payment.dateGraceFin);

  const style = `
    <style>
      @page { margin: 20mm; }
      body { 
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; 
        color: #0f172a; 
        line-height: 1.6;
        max-width: 210mm;
        margin: 0 auto;
        padding: 20px;
      }
      .header { 
        display: flex; 
        align-items: center; 
        gap: 20px; 
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 3px solid #fbbf24;
      }
      .header__logo {
        width: 80px;
        height: 80px;
        object-fit: contain;
      }
      .header__info {
        flex: 1;
      }
      .header__title {
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 8px;
      }
      .header__subtitle {
        font-size: 14px;
        color: #475569;
        margin-bottom: 4px;
      }
      .receipt-number {
        text-align: right;
        font-size: 12px;
        color: #64748b;
        margin-bottom: 20px;
      }
      .section {
        margin: 25px 0;
      }
      .section__title {
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #e2e8f0;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 150px 1fr;
        gap: 12px 20px;
        font-size: 14px;
      }
      .info-label {
        font-weight: 600;
        color: #475569;
      }
      .info-value {
        color: #0f172a;
      }
      .amount-box {
        background: linear-gradient(135deg, #fef3c7 0%, #d1fae5 100%);
        border: 2px solid #fbbf24;
        border-radius: 12px;
        padding: 20px;
        margin: 25px 0;
      }
      .amount-box__title {
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 12px;
      }
      .amount-box__value {
        font-size: 28px;
        font-weight: 700;
        color: #0f172a;
      }
      .period-box {
        background: #f8fafc;
        border-left: 4px solid #10b981;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .period-box__title {
        font-size: 13px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 8px;
      }
      .period-box__dates {
        font-size: 15px;
        color: #0f172a;
        font-weight: 500;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid #e2e8f0;
        font-size: 12px;
        color: #64748b;
        text-align: center;
      }
      .notice {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 12px;
        margin: 20px 0;
        border-radius: 4px;
        font-size: 13px;
        color: #92400e;
      }
    </style>
  `;

  const doc = `
    <div class="header">
      ${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" class="header__logo" alt="Logo EMSP" onerror="this.style.display='none'" />` : ''}
      <div class="header__info">
        <div class="header__title">REÇU DE PAIEMENT</div>
        <div class="header__subtitle">${escapeHtml(school.name)}</div>
        <div class="header__subtitle">${escapeHtml(school.address || '')}</div>
      </div>
    </div>

    <div class="receipt-number">
      <strong>N° ${escapeHtml(receiptNumber)}</strong>
    </div>

    <div class="section">
      <div class="section__title">Informations étudiant</div>
      <div class="info-grid">
        <div class="info-label">Nom complet:</div>
        <div class="info-value">${escapeHtml(student.nom)} ${escapeHtml(student.prenom || '')}</div>
        
        <div class="info-label">Classe:</div>
        <div class="info-value">${escapeHtml(student.classe || 'N/A')}</div>
        
        <div class="info-label">Contact:</div>
        <div class="info-value">${escapeHtml(student.contact || 'N/A')}</div>
      </div>
    </div>

    <div class="section">
      <div class="section__title">Détails du paiement</div>
      <div class="info-grid">
        <div class="info-label">Date de paiement:</div>
        <div class="info-value">${escapeHtml(datePaiement)}</div>
        
        <div class="info-label">Montant total:</div>
        <div class="info-value"><strong>${Number(payment.montantTotal || 0).toLocaleString('fr-FR')} FCFA</strong></div>
        
        <div class="info-label">Nombre de mois:</div>
        <div class="info-value">${payment.nombreMois} mois</div>
        
        <div class="info-label">Montant mensuel:</div>
        <div class="info-value">${Number(payment.montantMensuel || 0).toLocaleString('fr-FR')} FCFA</div>
        
        <div class="info-label">Enregistré par:</div>
        <div class="info-value">${escapeHtml(payment.educateurNom || 'N/A')}</div>
      </div>
    </div>

    <div class="amount-box">
      <div class="amount-box__title">MONTANT TOTAL PAYÉ</div>
      <div class="amount-box__value">${Number(payment.montantTotal || 0).toLocaleString('fr-FR')} FCFA</div>
    </div>

    <div class="period-box">
      <div class="period-box__title">Période d'abonnement couverte:</div>
      <div class="period-box__dates">
        Du ${escapeHtml(periodeDebut)} au ${escapeHtml(periodeFin)}
      </div>
    </div>

    <div class="notice">
      <strong>⚠️ Important:</strong> L'accès est valide pendant la période indiquée + 5 jours de grâce (jusqu'au ${escapeHtml(dateGraceFin)}).
    </div>

    ${payment.description ? `
      <div class="section">
        <div class="section__title">Description</div>
        <div style="font-size: 14px; color: #475569;">${escapeHtml(payment.description)}</div>
      </div>
    ` : ''}

    <div class="footer">
      <p>Ce reçu est généré automatiquement par le système de gestion des abonnements transport.</p>
      <p>Émis le ${new Date().toLocaleString('fr-FR')}</p>
    </div>
  `;

  win.document.write(`<!doctype html><html><head><meta charset="utf-8" />${style}<title>Reçu de paiement ${escapeHtml(receiptNumber)}</title></head><body>${doc}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

/**
 * Génère le contenu HTML du reçu pour affichage dans un modal
 */
export function generateReceiptHTML({ student, payment }, school = SCHOOL_INFO) {
  const receiptNumber = generateReceiptNumber(payment.id);
  const datePaiement = formatDate(payment.dateEnregistrement);
  const periodeDebut = formatDate(payment.moisDebut);
  const periodeFin = formatDate(payment.moisFin);
  const dateGraceFin = formatDate(payment.dateGraceFin);

  return {
    receiptNumber,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Inter, sans-serif;">
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #fbbf24;">
          ${school.logoUrl ? `<img src="${escapeHtml(school.logoUrl)}" style="width: 80px; height: 80px; object-fit: contain;" alt="Logo" onerror="this.style.display='none'" />` : ''}
          <div style="flex: 1;">
            <div style="font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">REÇU DE PAIEMENT</div>
            <div style="font-size: 14px; color: #475569;">${escapeHtml(school.name)}</div>
            <div style="font-size: 14px; color: #475569;">${escapeHtml(school.address || '')}</div>
          </div>
        </div>

        <div style="text-align: right; font-size: 12px; color: #64748b; margin-bottom: 20px;">
          <strong>N° ${escapeHtml(receiptNumber)}</strong>
        </div>

        <div style="margin: 25px 0;">
          <div style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">Informations étudiant</div>
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px 20px; font-size: 14px;">
            <div style="font-weight: 600; color: #475569;">Nom complet:</div>
            <div style="color: #0f172a;">${escapeHtml(student.nom)} ${escapeHtml(student.prenom || '')}</div>
            <div style="font-weight: 600; color: #475569;">Classe:</div>
            <div style="color: #0f172a;">${escapeHtml(student.classe || 'N/A')}</div>
            <div style="font-weight: 600; color: #475569;">Contact:</div>
            <div style="color: #0f172a;">${escapeHtml(student.contact || 'N/A')}</div>
          </div>
        </div>

        <div style="margin: 25px 0;">
          <div style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">Détails du paiement</div>
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px 20px; font-size: 14px;">
            <div style="font-weight: 600; color: #475569;">Date de paiement:</div>
            <div style="color: #0f172a;">${escapeHtml(datePaiement)}</div>
            <div style="font-weight: 600; color: #475569;">Montant total:</div>
            <div style="color: #0f172a;"><strong>${Number(payment.montantTotal || 0).toLocaleString('fr-FR')} FCFA</strong></div>
            <div style="font-weight: 600; color: #475569;">Nombre de mois:</div>
            <div style="color: #0f172a;">${payment.nombreMois} mois</div>
            <div style="font-weight: 600; color: #475569;">Montant mensuel:</div>
            <div style="color: #0f172a;">${Number(payment.montantMensuel || 0).toLocaleString('fr-FR')} FCFA</div>
            <div style="font-weight: 600; color: #475569;">Enregistré par:</div>
            <div style="color: #0f172a;">${escapeHtml(payment.educateurNom || 'N/A')}</div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #fef3c7 0%, #d1fae5 100%); border: 2px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <div style="font-size: 14px; font-weight: 600; color: #475569; margin-bottom: 12px;">MONTANT TOTAL PAYÉ</div>
          <div style="font-size: 28px; font-weight: 700; color: #0f172a;">${Number(payment.montantTotal || 0).toLocaleString('fr-FR')} FCFA</div>
        </div>

        <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <div style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px;">Période d'abonnement couverte:</div>
          <div style="font-size: 15px; color: #0f172a; font-weight: 500;">Du ${escapeHtml(periodeDebut)} au ${escapeHtml(periodeFin)}</div>
        </div>

        ${Array.isArray(payment.months) && payment.months.length ? `
          <div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 12px; margin: 20px 0; border-radius: 4px;">
            <div style="font-size: 13px; font-weight: 600; color: #3730a3; margin-bottom: 8px;">Mois couverts (${payment.months.length}) :</div>
            <div style="font-size: 14px; color: #312e81;">${escapeHtml(payment.months.join(', '))}</div>
          </div>
        ` : ''}

        <div style="margin: 25px 0;">
          <div style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">Détails financiers</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px;">
              <div style="font-size: 12px; font-weight: 600; color: #475569;">Montant mensuel</div>
              <div style="font-size: 18px; font-weight: 600; color: #0f172a;">${Number(payment.monthlyFee || payment.montantMensuel || 0).toLocaleString('fr-FR')} FCFA</div>
            </div>
            <div style="background: #f1f5f9; padding: 12px; border-radius: 8px;">
              <div style="font-size: 12px; font-weight: 600; color: #475569;">Nombre de mois</div>
              <div style="font-size: 18px; font-weight: 600; color: #0f172a;">${payment.nombreMois}</div>
            </div>
          </div>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #92400e;">
          <strong>⚠️ Important:</strong> L'accès est valide pendant la période indiquée + ${PAYMENT_CONFIG.GRACE_PERIOD_DAYS} jour(s) de grâce (jusqu'au ${escapeHtml(dateGraceFin)}).
        </div>

        ${payment.description ? `
          <div style="margin: 25px 0;">
            <div style="font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">Description</div>
            <div style="font-size: 14px; color: #475569;">${escapeHtml(payment.description)}</div>
          </div>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          <p>Ce reçu est généré automatiquement par le système de gestion des abonnements transport.</p>
          <p>Émis le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>
    `,
  };
}

/**
 * Génère le message WhatsApp pour le reçu
 */
export function generateReceiptWhatsAppMessage({ student, payment }, school = SCHOOL_INFO) {
  const receiptNumber = generateReceiptNumber(payment.id);
  const datePaiement = formatDateShort(payment.dateEnregistrement);
  const periodeDebut = formatDateShort(payment.moisDebut);
  const periodeFin = formatDateShort(payment.moisFin);
  const monthsList = Array.isArray(payment.months) && payment.months.length
    ? `Mois couverts: ${payment.months.join(', ')}\n`
    : '';

  return `🎓 *REÇU DE PAIEMENT - Abonnement Transport*

📋 *N° ${receiptNumber}*

👤 *Étudiant:* ${student.nom} ${student.prenom || ''}
📚 *Classe:* ${student.classe || 'N/A'}
📱 *Contact:* ${student.contact || 'N/A'}

💰 *Détails du paiement:*
📅 Date: ${datePaiement}
💵 Montant total: ${Number(payment.montantTotal || 0).toLocaleString('fr-FR')} FCFA
📆 Nombre de mois: ${payment.nombreMois} mois
💶 Montant mensuel: ${Number(payment.montantMensuel || 0).toLocaleString('fr-FR')} FCFA

📅 *Période couverte:*
Du ${periodeDebut} au ${periodeFin}
${monthsList ? `${monthsList}` : ''}

✅ *Enregistré par:* ${payment.educateurNom || 'N/A'}

⚠️ *Important:* Accès valide pendant la période indiquée + ${PAYMENT_CONFIG.GRACE_PERIOD_DAYS} jour(s) de grâce.

Merci pour votre confiance !`;
}

