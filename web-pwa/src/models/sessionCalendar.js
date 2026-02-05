/**
 * Système de calendrier basé sur le premier enregistrement
 * Les sessions sont représentées par des mois (YYYY-MM) mais commencent à partir du premier paiement
 * Format: 2025-01, 2025-02, etc. (basé sur le premier enregistrement, pas l'année calendaire)
 */

import { ensureFirestore } from '../services/firestoreService';

// Cache pour la date de début du système
let systemStartDate = null;
let systemStartDatePromise = null;

/**
 * Récupère la date du premier paiement enregistré dans le système
 * Cette date devient le point de départ du calendrier
 */
export async function getSystemStartDate() {
  // Utiliser le cache si disponible
  if (systemStartDate) {
    return systemStartDate;
  }

  // Éviter les appels multiples simultanés
  if (systemStartDatePromise) {
    return systemStartDatePromise;
  }

  systemStartDatePromise = (async () => {
    try {
      const db = ensureFirestore();
      if (!db) {
        // Si Firestore n'est pas disponible, utiliser la date actuelle
        const now = new Date();
        systemStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        return systemStartDate;
      }

      // Chercher le premier paiement dans tous les étudiants
      const studentsRef = db.collection('students');
      const studentsSnapshot = await studentsRef.get();

      let earliestDate = null;

      studentsSnapshot.forEach(doc => {
        const student = doc.data();
        const monthsPaid = Array.isArray(student.monthsPaid) ? student.monthsPaid : [];
        
        monthsPaid.forEach(payment => {
          if (payment.paidAt) {
            const paidDate = payment.paidAt.toDate ? payment.paidAt.toDate() : new Date(payment.paidAt);
            // Prendre le premier jour du mois du paiement
            const monthStart = new Date(paidDate.getFullYear(), paidDate.getMonth(), 1);
            
            if (!earliestDate || monthStart < earliestDate) {
              earliestDate = monthStart;
            }
          }
        });
      });

      // Si aucun paiement trouvé, utiliser la date actuelle
      if (!earliestDate) {
        const now = new Date();
        earliestDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      systemStartDate = earliestDate;
      return systemStartDate;
    } catch (error) {
      console.warn('Erreur récupération date début système:', error);
      // En cas d'erreur, utiliser la date actuelle
      const now = new Date();
      systemStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return systemStartDate;
    } finally {
      systemStartDatePromise = null;
    }
  })();

  return systemStartDatePromise;
}

/**
 * Réinitialise le cache de la date de début
 * Utile après un nouveau premier paiement
 */
export function resetSystemStartDateCache() {
  systemStartDate = null;
  systemStartDatePromise = null;
}

/**
 * Obtient l'ID de session pour une date donnée
 * Format: YYYY-MM (basé sur le premier enregistrement)
 * Les sessions sont représentées par des mois calendaires
 */
export function getSessionIdFromDate(date = new Date()) {
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Obtient l'ID de session pour une année et un mois donnés
 */
export function getSessionIdFromYearMonth(year, month) {
  const monthStr = String(month).padStart(2, '0');
  return `${year}-${monthStr}`;
}

/**
 * Extrait l'année et le mois d'un ID de session
 */
export function getYearMonthFromSessionId(sessionId) {
  const match = sessionId.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Convertit un sessionId (YYYY-MM) en nom de mois français
 * Ex: "2025-01" → "Janvier 2025"
 */
export function getMonthNameFromSessionId(sessionId) {
  const yearMonth = getYearMonthFromSessionId(sessionId);
  if (!yearMonth) return sessionId;
  
  const { year, month } = yearMonth;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/**
 * Convertit un tableau de sessionId en noms de mois français
 * Ex: ["2025-01", "2025-02"] → "Janvier 2025, Février 2025"
 */
export function getMonthNamesFromSessionIds(sessionIds) {
  if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
    return 'Aucun';
  }
  return sessionIds.map(id => getMonthNameFromSessionId(id)).join(', ');
}

/**
 * Obtient la plage de dates pour une session
 * sessionId format: YYYY-MM
 */
export function getSessionRange(sessionId) {
  const yearMonth = getYearMonthFromSessionId(sessionId);
  if (!yearMonth) {
    throw new Error(`ID de session invalide: ${sessionId}. Format attendu: YYYY-MM`);
  }

  const { year, month } = yearMonth;
  const monthIndex = month - 1; // JavaScript months are 0-based
  
  // Premier jour du mois
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  // Dernier jour du mois
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  // Début de la période de grâce (1er du mois suivant)
  const graceStart = new Date(year, monthIndex + 1, 1, 0, 0, 0, 0);
  // Fin de la période de grâce (5 du mois suivant)
  const graceEnd = new Date(year, monthIndex + 1, 5, 23, 59, 59, 999);
  
  return { start, end, graceStart, graceEnd };
}

/**
 * Vérifie si une date est dans la période de grâce d'une session
 */
export function isInGraceForSession(dateIso, sessionId) {
  if (!dateIso) return false;
  const { graceStart, graceEnd } = getSessionRange(sessionId);
  const d = new Date(dateIso);
  return d.getTime() >= graceStart.getTime() && d.getTime() <= graceEnd.getTime();
}

/**
 * Vérifie si une date est dans le mois d'une session
 */
export function isInSessionMonth(dateIso, sessionId) {
  if (!dateIso) return false;
  const { start, end } = getSessionRange(sessionId);
  const d = new Date(dateIso);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

/**
 * Calcule le numéro de mois relatif au premier enregistrement
 * MOIS 1 = premier mois du premier paiement
 * MOIS 2 = deuxième mois, etc.
 */
export async function getMonthNumber(sessionId) {
  const startDate = await getSystemStartDate();
  const yearMonth = getYearMonthFromSessionId(sessionId);
  if (!yearMonth) return null;
  
  const { year, month } = yearMonth;
  const sessionDate = new Date(year, month - 1, 1);
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
  // Calculer la différence en mois
  const diffMonths = (sessionDate.getFullYear() - startMonth.getFullYear()) * 12 + 
                     (sessionDate.getMonth() - startMonth.getMonth());
  
  return diffMonths + 1; // +1 car MOIS 1 est le premier mois
}

/**
 * Obtient le label d'affichage pour une session
 * Format: "MOIS N (Mois Année)" pour garder la référence
 * Ex: "MOIS 1 (Janvier 2025)", "MOIS 2 (Février 2025)"
 */
export async function getSessionLabel(sessionId) {
  const yearMonth = getYearMonthFromSessionId(sessionId);
  if (!yearMonth) return sessionId;
  
  const { year, month } = yearMonth;
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  
  // Calculer le numéro de mois
  const monthNumber = await getMonthNumber(sessionId);
  if (monthNumber === null) {
    return monthName; // Fallback si calcul impossible
  }
  
  // Format: "MOIS N (Mois Année)"
  return `MOIS ${monthNumber} (${monthName})`;
}

/**
 * Génère une liste de sessions disponibles (mois)
 * Retourne les mois à partir du premier enregistrement jusqu'à maintenant
 */
export async function generateSessionList(count = 12) {
  const startDate = await getSystemStartDate();
  const now = new Date();
  const sessions = [];
  
  // Commencer par le mois actuel et remonter
  let currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
  let added = 0;
  while (added < count && currentDate >= startMonth) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const sessionId = getSessionIdFromYearMonth(year, month);
    
    // Calculer le numéro de mois relatif au premier enregistrement
    const diffMonths = (currentDate.getFullYear() - startMonth.getFullYear()) * 12 + 
                       (currentDate.getMonth() - startMonth.getMonth());
    const monthNumber = diffMonths + 1;
    
    // Format: "MOIS N (Mois Année)"
    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const label = `MOIS ${monthNumber} (${monthName})`;
    
    sessions.unshift({
      id: sessionId,
      label: label,
      date: new Date(currentDate),
      year,
      month,
      monthNumber, // Ajouter le numéro de mois pour faciliter la navigation
    });
    
    // Passer au mois précédent
    currentDate.setMonth(currentDate.getMonth() - 1);
    added++;
  }
  
  return sessions;
}

