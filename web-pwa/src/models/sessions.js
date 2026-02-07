// Helpers for monthly sessions with 5-day grace period

export function getSessionIdFromDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`; // e.g., 2025-11
}

export function getSessionRange(sessionId) {
  // sessionId: YYYY-MM
  const [y, m] = sessionId.split('-').map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
  const graceStart = new Date(y, m, 1, 0, 0, 0, 0); // 1st of next month
  const graceEnd = new Date(y, m, 5, 23, 59, 59, 999); // 5th of next month
  return { start, end, graceStart, graceEnd };
}

export function isInGraceForSession(dateIso, sessionId) {
  if (!dateIso) return false;
  const { graceStart, graceEnd } = getSessionRange(sessionId);
  const d = new Date(dateIso);
  return d.getTime() >= graceStart.getTime() && d.getTime() <= graceEnd.getTime();
}

export function isInSessionMonth(dateIso, sessionId) {
  if (!dateIso) return false;
  const { start, end } = getSessionRange(sessionId);
  const d = new Date(dateIso);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

// Determine monthly payment status according to the spec
export function computeMonthlyPaymentStatus(student, sessionId) {
  // monthsPaid entries: { monthCount, paidAt, sessionId }
  const payments = Array.isArray(student?.monthsPaid) ? student.monthsPaid : [];
  // Paiement pour ce mois spÃ©cifiquement (supporte paiement Ã  l'avance grÃ¢ce Ã  sessionId)
  const entryForSession = payments.find(p => p.sessionId === sessionId);
  const paidInMonth = payments.find(p => isInSessionMonth(p.paidAt, sessionId));
  const paidInGrace = payments.find(p => isInGraceForSession(p.paidAt, sessionId));

  const now = new Date();
  const { end, graceEnd } = getSessionRange(sessionId);

  // During month (1..30/31)
  if (now <= end) {
    if (entryForSession) return { code: 'PAYE', label: 'PAYE', paidAt: entryForSession.paidAt };
    if (paidInMonth) return { code: 'PAYE', label: 'PAYE', paidAt: paidInMonth.paidAt };
    return { code: 'IMPAYE', label: 'IMPAYE', paidAt: null };
  }

  // During grace (1..5 next month)
  if (now > end && now <= graceEnd) {
    if (entryForSession) return { code: 'PAYE_EN_RETARD', label: 'PAYE EN RETARD', paidAt: entryForSession.paidAt };
    if (paidInGrace) return { code: 'PAYE_EN_RETARD', label: 'PAYE EN RETARD', paidAt: paidInGrace.paidAt };
    return { code: 'GRACE_ACTIVE', label: 'GRACE ACTIVE', paidAt: null };
  }

  // After grace (> 5)
  if (entryForSession) return { code: 'PAYE_HORS_DELAI', label: 'PAYE HORS DELAI', paidAt: entryForSession.paidAt };
  if (paidInGrace) return { code: 'PAYE_HORS_DELAI', label: 'PAYE HORS DELAI', paidAt: paidInGrace.paidAt };
  return { code: 'DEFAILLANT', label: 'DEFAILLANT', paidAt: null };
}

/**
 * Calcule le nombre de mois d'avance pour un mois donnÃ©
 * Retourne 0 si le mois n'est pas dans le futur
 */
function calculateMonthsInAdvance(sessionYear, sessionMonth, currentYear, currentMonth) {
  if (sessionYear > currentYear) {
    return (sessionYear - currentYear) * 12 + (sessionMonth - currentMonth);
  } else if (sessionYear === currentYear && sessionMonth > currentMonth) {
    return sessionMonth - currentMonth;
  }
  return 0;
}

/**
 * Trouve tous les mois payÃ©s en avance pour un Ã©tudiant
 */
function getAdvancePayments(student, currentYear, currentMonth) {
  const ledger = Array.isArray(student?.monthsLedger) ? student.monthsLedger : [];
  const payments = Array.isArray(student?.monthsPaid) ? student.monthsPaid : [];
  const advancePayments = [];
  
  for (const sessionId of ledger) {
    const [sessionYear, sessionMonth] = sessionId.split('-').map(Number);
    const monthsAhead = calculateMonthsInAdvance(sessionYear, sessionMonth, currentYear, currentMonth);
    
    if (monthsAhead > 0) {
      const payment = payments.find(p => p.sessionId === sessionId);
      advancePayments.push({
        sessionId,
        monthsAhead,
        paidAt: payment?.paidAt || null,
      });
    }
  }
  
  return advancePayments.sort((a, b) => a.monthsAhead - b.monthsAhead);
}

export function buildMonthlyReport(students, sessionId) {
  const rows = [];
  let totalStudents = 0;
  let paidOnTime = 0;
  let paidInGrace = 0;
  let unpaid = 0;
  let defaulters = 0;
  let paidOutOfGrace = 0;
  let paidInAdvance = 0;
  let totalAdvanceMonths = 0; // Total de mois payÃ©s en avance
  let totalAmountForSession = 0; // Somme totale attribuÃ©e Ã  cette session

  // Extraire l'annÃ©e et le mois de la session pour vÃ©rifier les paiements en avance
  const [sessionYear, sessionMonth] = sessionId.split('-').map(Number);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based
  // Un mois est dans le futur si son annÃ©e est supÃ©rieure, ou si mÃªme annÃ©e mais mois supÃ©rieur
  const isFutureMonth = sessionYear > currentYear || (sessionYear === currentYear && sessionMonth > currentMonth);
  const monthsAhead = calculateMonthsInAdvance(sessionYear, sessionMonth, currentYear, currentMonth);

  for (const student of students) {
    if (!student) continue;
    totalStudents += 1;
    const promoLabel = student.niveau || student.promo || '';
    const classLabel = student.classGroup || student.classe || '';

    // VÃ©rifier si l'Ã©tudiant a payÃ© en avance pour ce mois
    const ledger = Array.isArray(student?.monthsLedger) ? student.monthsLedger : [];
    const hasPaidForSession = ledger.includes(sessionId);
    const isAdvancePayment = hasPaidForSession && isFutureMonth;
    
    // Si c'est un paiement en avance, marquer directement comme tel
    if (isAdvancePayment) {
      paidInAdvance += 1;
      totalAdvanceMonths += 1; // Compter ce mois payÃ© en avance
      
      // Obtenir tous les mois payÃ©s en avance pour cet Ã©tudiant (pour info)
      const allAdvancePayments = getAdvancePayments(student, currentYear, currentMonth);
      
      const payments = Array.isArray(student?.monthsPaid) ? student.monthsPaid : [];
      const paymentForSession = payments.find(p => p.sessionId === sessionId);
      
      // Montant attribuÃ© Ã  cette session (paiement en avance pour un mois futur = on compte pour cette session future uniquement)
      const amountForAdvance = Number(paymentForSession?.amountPerMonth || 0);
      totalAmountForSession += amountForAdvance;
      rows.push({
        studentId: student.id,
        name: student.name || '',
        promo: promoLabel,
        classGroup: classLabel,
        busLine: student.busLine || '',
        status: `PAYE EN AVANCE (${monthsAhead} mois)`,
        paidAt: paymentForSession?.paidAt || '',
        amount: amountForAdvance,
        advanceInfo: {
          monthsAhead,
          totalAdvanceMonths: allAdvancePayments.length,
          allAdvancePayments,
        },
      });
      continue;
    }
    
    const status = computeMonthlyPaymentStatus(student, sessionId);
    // Ne pas marquer "IMPAYÃ‰" pour un nouvel Ã©tudiant du mois courant sans paiement attendu
    const createdAtIso = student.audit?.createdAt || student.audit?.created_at || null;
    const createdInThisSession = createdAtIso && isInSessionMonth(createdAtIso, sessionId);
    const isNewWithoutPayment = createdInThisSession && status.code === 'IMPAYE';
    const effectiveStatus = isNewWithoutPayment ? { code: 'NOUVEAU', label: 'NOUVEAU', paidAt: null } : status;
    
    if (effectiveStatus.code === 'PAYE') paidOnTime += 1;
    else if (effectiveStatus.code === 'GRACE_ACTIVE') unpaid += 1;
    else if (effectiveStatus.code === 'PAYE_EN_RETARD') paidInGrace += 1;
    else if (effectiveStatus.code === 'DEFAILLANT') defaulters += 1;
    else if (effectiveStatus.code === 'PAYE_HORS_DELAI') paidOutOfGrace += 1;
    // Calcul du montant attribuable Ã  cette session: sommer amountPerMonth pour les entrÃ©es correspondant exactement Ã  ce sessionId
    const payments = Array.isArray(student?.monthsPaid) ? student.monthsPaid : [];
    const entriesForSession = payments.filter(p => p.sessionId === sessionId);
    const amountForStudent = entriesForSession.reduce((sum, p) => sum + (Number(p.amountPerMonth) || 0), 0);
    totalAmountForSession += amountForStudent;

    rows.push({
      studentId: student.id,
      name: student.name || '',
      promo: promoLabel,
      classGroup: classLabel,
      busLine: student.busLine || '',
      status: effectiveStatus.label,
      paidAt: effectiveStatus.paidAt || '',
      amount: amountForStudent,
    });
  }

  const summary = {
    sessionId,
    totalStudents,
    paidOnTime,
    paidInGrace,
    unpaid,
    defaulters,
    paidOutOfGrace,
    paidInAdvance,
    totalAdvanceMonths,
    totalAmountForSession,
  };

  return { summary, rows };
}

