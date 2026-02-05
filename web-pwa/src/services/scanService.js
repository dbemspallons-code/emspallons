/**
 * Service de gestion des scans
 * MIGRATION FIRESTORE - Utilise Firestore au lieu de localStorage
 */

import { fetchWithQueue } from './offlineService';

const LAST_SCAN_PREFIX = 'last_scan:'; // Utilisé pour sessionStorage (session temporaire OK)

// Utiliser sessionStorage pour les derniers scans (session temporaire)
export async function getLastScan(studentId) {
  if (typeof window === 'undefined') return null;
  try {
    const key = `${LAST_SCAN_PREFIX}${studentId}`;
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Erreur getLastScan:', error);
    return null;
  }
}

export async function setLastScan(studentId, payload) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${LAST_SCAN_PREFIX}${studentId}`;
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.warn('Erreur setLastScan:', error);
  }
}

export async function clearLastScan(studentId) {
  if (typeof window === 'undefined') return;
  try {
    const key = `${LAST_SCAN_PREFIX}${studentId}`;
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('Erreur clearLastScan:', error);
  }
}

/**
 * Enregistre un scan dans Firestore
 */
export async function logScan(studentId, payload) {
  try {
    // Send to Netlify function which will persist to Supabase
    const res = await fetchWithQueue('/.netlify/functions/log-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        status: payload.status,
        paymentStatus: payload.paymentStatus,
        controllerId: payload.controllerId || null,
        controllerName: payload.controllerName || null,
        reason: payload.reason || null,
      }),
    });

    return res;
  } catch (err) {
    console.error('Erreur logScan (offline queued):', err);
    return null;
  }
}

/**
 * Récupère les logs de scan depuis Firestore
 */
export async function getScanLogs(limitCount = 100) {
  try {
    const res = await fetch(`/.netlify/functions/get-scan-logs?limit=${limitCount}`, { method: 'GET' });
    if (!res.ok) {
      console.warn('getScanLogs: server returned', res.status);
      return [];
    }
    const data = await res.json();
    return data.logs || [];
  } catch (error) {
    console.error('Erreur getScanLogs (fetch):', error);
    return [];
  }
}

