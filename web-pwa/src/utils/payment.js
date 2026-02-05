import { PAYMENT_CONFIG, MONTH_NAMES } from '../constants/payment';

function resolveStartDate(startMonthIndex) {
  const today = new Date();
  const currentYear = today.getFullYear();
  let year = currentYear;

  if (startMonthIndex < 0 || startMonthIndex > 11) {
    throw new Error('Indice de mois invalide. Utilisez une valeur entre 0 et 11.');
  }

  if (startMonthIndex < today.getMonth()) {
    year += 1;
  }

  return new Date(year, startMonthIndex, 1, 0, 0, 0, 0);
}

export function calculatePaymentPlan(startMonthIndex, numberOfMonths, customMonthlyFee) {
  if (!numberOfMonths || numberOfMonths <= 0) {
    throw new Error('Le nombre de mois doit être supérieur à 0');
  }

  const monthlyFee = Number(customMonthlyFee) || PAYMENT_CONFIG.DEFAULT_MONTHLY_FEE;
  const totalAmount = monthlyFee * numberOfMonths;

  const startDate = resolveStartDate(startMonthIndex);
  const periodStart = new Date(startDate);
  const periodEnd = new Date(startDate.getFullYear(), startDate.getMonth() + numberOfMonths, 0, 23, 59, 59, 999);

  const graceEnd = new Date(periodEnd);
  graceEnd.setDate(graceEnd.getDate() + PAYMENT_CONFIG.GRACE_PERIOD_DAYS);
  graceEnd.setHours(23, 59, 59, 999);

  const monthLabels = [];
  for (let i = 0; i < numberOfMonths; i += 1) {
    const date = new Date(periodStart.getFullYear(), periodStart.getMonth() + i, 1);
    const label = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    monthLabels.push(label);
  }

  return {
    monthlyFee,
    numberOfMonths,
    totalAmount,
    months: monthLabels,
    periodStart,
    periodEnd,
    graceEnd,
    validUntil: periodEnd,
    startMonthIndex,
  };
}

export function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString('fr-FR');
}

