import QRCode from 'qrcode';
import { historyService } from './historyService';
import { fetchWithQueue } from './offlineService';

function toBase64Url(data) {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateRandomToken(studentId) {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(8);
      window.crypto.getRandomValues(array);
      const randomPart = Array.from(array)
        .map((val) => val.toString(16).padStart(8, '0'))
        .join('');
      return toBase64Url(`${studentId}-${Date.now()}-${randomPart}`).slice(0, 48);
    }
  } catch (error) {
    console.warn('QR token generation fallback', error);
  }

  return toBase64Url(`${studentId}-${Date.now()}-${Math.random()}`).slice(0, 48);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

class QRCodeService {
  async generateStudentQR(student) {
    const payload = {
      id: student.id,
      name: student.nom,
      class: student.classe,
      token: student.qrToken || generateRandomToken(student.id),
      generatedAt: Date.now(),
    };

    const dataString = JSON.stringify(payload);

    const qrImage = await QRCode.toDataURL(dataString, {
      errorCorrectionLevel: 'H',
      width: 1024,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    await historyService.log({
      type: 'QR_GENERATED',
      entityId: student.id,
      entityType: 'STUDENT',
      action: 'QR_CODE_GENERATED',
      details: {
        studentName: `${student.nom} ${student.prenom || ''}`.trim(),
        qrGeneratedAt: new Date().toISOString(),
      },
    });

    return { qrImage, payload };
  }

  async generatePrintableCard(student, qrImage) {
    if (typeof document === 'undefined') {
      return null;
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const CARD_WIDTH = 1011;
      const CARD_HEIGHT = 638;

      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
      gradient.addColorStop(0, 'rgba(79, 70, 229, 0.06)');
      gradient.addColorStop(1, 'rgba(124, 58, 237, 0.06)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, 12, 12, CARD_WIDTH - 24, CARD_HEIGHT - 24, 24);
      ctx.stroke();

      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('🎓 ÉCOLE - CARTE TRANSPORT', 48, 72);

      ctx.font = '18px Arial';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(`📅 Année scolaire ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, 48, 108);

      ctx.font = 'bold 30px Arial';
      ctx.fillStyle = '#111827';
      ctx.fillText(`${student.nom} ${student.prenom || ''}`.trim(), 48, CARD_HEIGHT - 180);

      ctx.font = '22px Arial';
      ctx.fillStyle = '#4B5563';
      ctx.fillText(`🎓 Classe : ${student.classe || '-'}`, 48, CARD_HEIGHT - 136);

      ctx.font = '18px Arial';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(`🆔 ${student.id}`, 48, CARD_HEIGHT - 102);

      ctx.font = '16px Arial';
      ctx.fillStyle = '#EF4444';
      ctx.fillText('⚠️ Ne pas plier • Garder propre • Scanner pour accès au bus scolaire', 48, CARD_HEIGHT - 48);

      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        const qrSize = 400;
        const qrX = CARD_WIDTH - qrSize - 60;
        const qrY = (CARD_HEIGHT - qrSize) / 2;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        resolve(canvas.toDataURL('image/png'));
      };
      qrImg.onerror = () => resolve(qrImage);
      qrImg.src = qrImage;
    });
  }

  validateQR(qrString) {
    try {
      const data = JSON.parse(qrString);
      if (!data.id || !data.token || !data.generatedAt) {
        return null;
      }

      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      if (Date.now() - data.generatedAt > oneYearMs) {
        return null;
      }

      return data;
    } catch (error) {
      console.warn('QR validation failed', error);
      return null;
    }
  }

  // Server-side generation of QR token using Netlify function
  async requestServerQrToken(subscriberId) {
    try {
      const res = await fetchWithQueue('/.netlify/functions/generate-qr-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriber_id: subscriberId }),
      });
      if (res && res.offline) return { offline: true };
      return res;
    } catch (err) {
      console.error('requestServerQrToken error', err);
      return { error: err.message };
    }
  }

  // Server-side verification of a QR token (immediate response)
  async verifyServerQrToken(token) {
    try {
      const response = await fetch('/.netlify/functions/verify-qr-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({ ok: response.ok }));
      return data;
    } catch (err) {
      console.error('verifyServerQrToken error', err);
      return { error: err.message };
    }
  }
}

export const qrCodeService = new QRCodeService();

