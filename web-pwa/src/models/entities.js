export const BUS_LINES = [
  {
    id: 'line-yopougon',
    name: 'Yopougon',
    color: '#2563eb',
  },
  {
    id: 'line-abobo',
    name: 'Abobo',
    color: '#22c55e',
  },
  {
    id: 'line-angre-bingerville',
    name: 'Angré / Bingerville',
    color: '#f59e0b',
  },
];

export const PAYMENT_STATUS = {
  UP_TO_DATE: 'up_to_date', // ACTIF
  LATE: 'late', // EN RETARD
  OUT_OF_SERVICE: 'out_of_service',
  EXPIRED: 'expired', // EXPIRÉ
};

// Statuts d'abonnement selon les spécifications
export const SUBSCRIPTION_STATUS = {
  ACTIF: 'ACTIF',
  EN_RETARD: 'EN RETARD',
  EXPIRE: 'EXPIRÉ',
};

export const SUBSCRIPTION_PLANS = [
  { id: 'monthly', label: 'Mensuel', durationMonths: 1 },
  { id: 'quarterly', label: 'Trimestriel', durationMonths: 3 },
  { id: 'yearly', label: 'Annuel', durationMonths: 12 },
];

export const QR_STATUS = {
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
};

export const SCAN_STATUS = {
  APPROVED: 'approved',
  DUPLICATE: 'duplicate',
  EXPIRED: 'expired',
  FRAUD: 'fraud',
  ERROR: 'error',
};

export function getPlanById(planId = 'monthly') {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId) || SUBSCRIPTION_PLANS[0];
}

/**
 * Calcule la date d'expiration selon la logique stricte :
 * - Abonnement commence TOUJOURS le 1er du mois du paiement
 * - Se termine le dernier jour du dernier mois payé
 * - Ajoute 5 jours de grâce automatiquement
 * - Expiration finale = 5 du mois suivant à 23h59
 * 
 * Exemple : Paiement le 25 janvier pour 1 mois
 * - Début : 1er janvier
 * - Fin : 31 janvier
 * - Expiration : 5 février 23h59
 */
export function computeExpirationDate(startDateIso, planId, customMonthsPaid) {
  const paidDate = startDateIso ? new Date(startDateIso) : new Date();
  const plan = getPlanById(planId);
  const months = customMonthsPaid ?? plan.durationMonths;
  
  // Début = 1er du mois du paiement
  const debut = new Date(paidDate.getFullYear(), paidDate.getMonth(), 1, 0, 0, 0, 0);
  
  // Fin = Dernier jour du dernier mois payé
  const fin = new Date(debut);
  fin.setMonth(fin.getMonth() + months);
  fin.setDate(0); // Dernier jour du mois précédent (car setMonth + months nous met au mois suivant)
  fin.setHours(23, 59, 59, 999);
  
  // Expiration finale = Fin + 5 jours de grâce
  const expiration = new Date(fin);
  expiration.setDate(expiration.getDate() + 5);
  expiration.setHours(23, 59, 59, 999);
  
  return expiration.toISOString();
}

export function isSubscriptionActive(student) {
  const expiration = student?.subscription?.expiresAt;
  if (!expiration) return false;
  return new Date(expiration).getTime() >= Date.now();
}

// Vérifier si l'abonnement est en période de grâce (5 jours après expiration)
// Note: L'expiration stockée dans subscription.expiresAt inclut déjà les 5 jours de grâce
// Cette fonction vérifie si on est dans la période de grâce (entre fin du mois et expiration finale)
export function isInGracePeriod(student) {
  const expiration = student?.subscription?.expiresAt;
  if (!expiration) return false;
  const expDate = new Date(expiration);
  const now = Date.now();
  // L'expiration finale inclut déjà les 5 jours de grâce
  // On est en grâce si on est après la fin du mois mais avant l'expiration finale
  const expTime = expDate.getTime();
  // Calculer la fin du mois (5 jours avant l'expiration finale)
  const endOfMonth = new Date(expDate);
  endOfMonth.setDate(endOfMonth.getDate() - 5);
  endOfMonth.setHours(23, 59, 59, 999);
  return now > endOfMonth.getTime() && now <= expTime;
}

// Calculer le statut mensuel strict : abonnement valide du 1er au 30/31, puis grâce 5 jours
// Utilise monthsLedger pour vérifier les mois payés (sessions basées sur le premier enregistrement)
export async function computeMonthlySubscriptionStatus(student) {
  const { getSessionIdFromDate, getSessionRange } = await import('./sessionCalendar');
  // Récupérer les paramètres globaux (mois en pause)
  let paused = [];
  try {
    const { fetchGlobalSettings } = await import('../services/firestoreService');
    const settings = await fetchGlobalSettings();
    paused = Array.isArray(settings.pausedMonths) ? settings.pausedMonths : [];
  } catch {}
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based
  
  // Session actuelle : SESSION-N (basée sur le premier enregistrement)
  const currentSessionId = await getSessionIdFromDate(now);
  // Si le mois est en pause, considérer comme à jour (accès autorisé)
  if (paused.includes(currentSessionId)) {
    return PAYMENT_STATUS.UP_TO_DATE;
  }
  
  // Mois suivant pour vérifier les paiements en avance
  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const nextSessionId = await getSessionIdFromDate(nextMonthDate);
  
  const ledger = Array.isArray(student?.monthsLedger) ? student.monthsLedger : [];
  const hasCurrentMonth = ledger.includes(currentSessionId);
  const hasNextMonth = ledger.includes(nextSessionId);
  
  // Obtenir la plage de dates pour la session actuelle
  const { end, graceEnd } = await getSessionRange(currentSessionId);
  
  // Si l'étudiant a payé pour le mois actuel OU le mois suivant (paiement en avance)
  if (hasCurrentMonth || hasNextMonth) {
    // Pendant le mois (1er au 30/31)
    if (now <= end) {
      return PAYMENT_STATUS.UP_TO_DATE; // ACTIF
    }
    // Pendant la période de grâce (1er au 5 du mois suivant)
    if (now <= graceEnd) {
      return PAYMENT_STATUS.LATE; // EN RETARD (mais accès autorisé)
    }
  }
  
  // Après la période de grâce ou pas de paiement
  return PAYMENT_STATUS.EXPIRED; // EXPIRÉ
}

// Calculer le statut de paiement automatique avec période de grâce
// Selon les spécifications : ACTIF → EN RETARD → EXPIRÉ
// Utilise maintenant la logique mensuelle stricte
export async function computePaymentStatus(student) {
  // Utiliser la nouvelle logique mensuelle stricte
  return await computeMonthlySubscriptionStatus(student);
}

// Calculer le statut d'abonnement détaillé avec messages (logique mensuelle stricte)
// Utilise le système de sessions basé sur le premier enregistrement
export async function computeSubscriptionStatus(student) {
  const { getSessionIdFromDate, getSessionRange } = await import('./sessionCalendar');
  let paused = [];
  try {
    const { fetchGlobalSettings } = await import('../services/firestoreService');
    const settings = await fetchGlobalSettings();
    paused = Array.isArray(settings.pausedMonths) ? settings.pausedMonths : [];
  } catch {}
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  
  // Session actuelle : SESSION-N (basée sur le premier enregistrement)
  const currentSessionId = await getSessionIdFromDate(now);
  if (paused.includes(currentSessionId)) {
    return {
      status: 'ACTIF',
      access: true,
      message: 'Service en pause (vacances). Accès autorisé.',
      daysRemaining: 0,
    };
  }
  
  // Mois suivant pour vérifier les paiements en avance
  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const nextSessionId = await getSessionIdFromDate(nextMonthDate);
  
  const ledger = Array.isArray(student?.monthsLedger) ? student.monthsLedger : [];
  const hasCurrentMonth = ledger.includes(currentSessionId);
  const hasNextMonth = ledger.includes(nextSessionId);
  
  // Obtenir la plage de dates pour la session actuelle
  const { end, graceEnd } = await getSessionRange(currentSessionId);
  const lastDayOfMonth = new Date(end).getDate();
  
  // Si l'étudiant a payé pour le mois actuel OU le mois suivant (paiement en avance)
  if (hasCurrentMonth || hasNextMonth) {
    // Pendant le mois (1er au 30/31)
    if (now <= end) {
      const daysRemaining = lastDayOfMonth - currentDay + 1;
      return {
        status: 'ACTIF',
        access: true,
        message: null,
        daysRemaining,
      };
    }
    // Pendant la période de grâce (1er au 5 du mois suivant)
    if (now <= graceEnd) {
      const daysInGrace = Math.ceil((graceEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        status: 'EN RETARD',
        access: true,
        message: `Votre abonnement expire dans ${daysInGrace} jour(s)`,
        daysRemaining: daysInGrace,
      };
    }
  }
  
  // Après la période de grâce ou pas de paiement
  return {
    status: 'EXPIRÉ',
    access: false,
    message: 'Abonnement expiré. Veuillez renouveler.',
    daysRemaining: 0,
  };
}

export function getInitialStudent(values = {}) {
  const now = new Date().toISOString();
  const plan = getPlanById(values.subscriptionPlan || values.subscription?.planId || 'monthly');
  const subscription = normalizeSubscription(values.subscription, plan, values.startedAt, values.monthsPaidCount);

  return {
    id: values.id ?? `local-${cryptoRandomId()}`,
    name: values.name ?? '',
    contact: values.contact ?? '',
    niveau: values.niveau ?? '',
    classGroup: values.classGroup ?? '',
    busLine: values.busLine ?? BUS_LINES[0].id,
    guardian: values.guardian ?? '',
    pickupPoint: values.pickupPoint ?? '',
    monthlyFee: typeof values.monthlyFee === 'number' ? values.monthlyFee : Number(values.monthlyFee) || 0,
    paymentStatus: values.paymentStatus ?? PAYMENT_STATUS.UP_TO_DATE,
    subscriptionPlan: plan.id,
    subscription,
    qrCode: {
      tokenId: values.qrCode?.tokenId ?? null,
      token: values.qrCode?.token ?? null, // Token sécurisé pour le QR code
      status: values.qrCode?.status ?? QR_STATUS.ACTIVE,
      lastIssuedAt: values.qrCode?.lastIssuedAt ?? null,
    },
    audit: {
      createdAt: values.audit?.createdAt ?? now,
      createdBy: values.audit?.createdBy ?? null,
      updatedAt: values.audit?.updatedAt ?? now,
      updatedBy: values.audit?.updatedBy ?? null,
    },
    monthsPaid: Array.isArray(values.monthsPaid) ? values.monthsPaid : [],
    monthsLedger: Array.isArray(values.monthsLedger) ? values.monthsLedger : [],
    notes: values.notes ?? '',
  };
}

function normalizeSubscription(current, plan, fallbackStartedAt, fallbackMonths) {
  const now = new Date().toISOString();
  const startedAt = current?.startedAt ?? fallbackStartedAt ?? now;
  const monthsPaidCount = current?.monthsPaidCount ?? fallbackMonths ?? plan.durationMonths;
  const expiresAt = current?.expiresAt ?? computeExpirationDate(startedAt, plan.id, monthsPaidCount);
  return {
    planId: current?.planId ?? plan.id,
    monthsPaidCount,
    startedAt,
    expiresAt,
  };
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

export function parseQrToken(token) {
  try {
    const decoded = JSON.parse(atob(token));
    return decoded && typeof decoded === 'object' ? decoded : null;
  } catch (error) {
    console.warn('Unable to parse QR token', error);
    return null;
  }
}

