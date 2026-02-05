/**
 * Service de rapports avancés
 * Gère les rapports personnalisés, programmés, comparaisons et prédictions
 */

import { buildMonthlyReport } from '../models/sessions';
import { exportMonthlyReportCSV, exportSubscribersCSV } from './exportCSV';
import { exportMonthlyReportPDF } from './exportPDF';

/**
 * Compare deux sessions mensuelles
 */
export function compareSessions(students, sessionId1, sessionId2) {
  const report1 = buildMonthlyReport(students, sessionId1);
  const report2 = buildMonthlyReport(students, sessionId2);
  
  return {
    session1: {
      id: sessionId1,
      summary: report1.summary,
    },
    session2: {
      id: sessionId2,
      summary: report2.summary,
    },
    comparison: {
      totalStudentsDiff: report2.summary.totalStudents - report1.summary.totalStudents,
      paidOnTimeDiff: report2.summary.paidOnTime - report1.summary.paidOnTime,
      paidInGraceDiff: report2.summary.paidInGrace - report1.summary.paidInGrace,
      unpaidDiff: report2.summary.unpaid - report1.summary.unpaid,
      defaultersDiff: report2.summary.defaulters - report1.summary.defaulters,
      paidOutOfGraceDiff: report2.summary.paidOutOfGrace - report1.summary.paidOutOfGrace,
    },
  };
}

/**
 * Génère un rapport personnalisé
 */
export function generateCustomReport(students, options = {}) {
  const {
    sessionId,
    includeDetails = true,
    includeSummary = true,
    filterByStatus = null,
    filterByLine = null,
  } = options;
  
  const report = buildMonthlyReport(students, sessionId);
  
  let rows = report.rows;
  
  // Appliquer les filtres
  if (filterByStatus) {
    rows = rows.filter(r => r.status === filterByStatus);
  }
  if (filterByLine) {
    rows = rows.filter(r => r.busLine === filterByLine);
  }
  
  const customReport = {
    sessionId,
    generatedAt: new Date().toISOString(),
    options,
  };
  
  if (includeSummary) {
    customReport.summary = {
      ...report.summary,
      filteredTotal: rows.length,
    };
  }
  
  if (includeDetails) {
    customReport.rows = rows;
  }
  
  return customReport;
}

/**
 * Exporte un rapport personnalisé
 */
export function exportCustomReport(customReport, format = 'csv') {
  const filename = `rapport-personnalise-${customReport.sessionId}-${Date.now()}`;
  
  if (format === 'csv') {
    if (customReport.rows) {
      exportMonthlyReportCSV({ rows: customReport.rows, summary: customReport.summary }, `${filename}.csv`);
    }
  } else if (format === 'pdf') {
    if (customReport.rows) {
      exportMonthlyReportPDF({ rows: customReport.rows, summary: customReport.summary }, `Rapport ${customReport.sessionId}`);
    }
  }
}

/**
 * Prédit les revenus futurs basés sur l'historique
 */
export function predictFutureRevenue(students, monthsAhead = 3) {
  const now = new Date();
  const predictions = [];
  
  // Calculer le revenu moyen mensuel basé sur les étudiants actifs
  const activeStudents = students.filter(s => {
    const status = s.paymentStatus;
    return status === 'up_to_date' || status === 'late';
  });
  
  const averageMonthlyFee = activeStudents.reduce((sum, s) => {
    return sum + (Number(s.monthlyFee) || 12500);
  }, 0) / (activeStudents.length || 1);
  
  const estimatedMonthlyRevenue = activeStudents.length * averageMonthlyFee;
  
  for (let i = 1; i <= monthsAhead; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const sessionId = `${year}-${month}`;
    
    predictions.push({
      sessionId,
      month: futureDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      estimatedRevenue: estimatedMonthlyRevenue,
      estimatedStudents: activeStudents.length,
      confidence: 'medium', // basé sur l'historique actuel
    });
  }
  
  return {
    currentAverage: estimatedMonthlyRevenue,
    currentActiveStudents: activeStudents.length,
    predictions,
  };
}

/**
 * Génère un rapport de tendances
 */
export function generateTrendReport(students, sessionIds) {
  const reports = sessionIds.map(sessionId => buildMonthlyReport(students, sessionId));
  
  const trends = {
    totalStudents: reports.map(r => r.summary.totalStudents),
    paidOnTime: reports.map(r => r.summary.paidOnTime),
    paidInGrace: reports.map(r => r.summary.paidInGrace),
    unpaid: reports.map(r => r.summary.unpaid),
    defaulters: reports.map(r => r.summary.defaulters),
  };
  
  // Calculer les tendances (augmentation/diminution)
  const calculateTrend = (values) => {
    if (values.length < 2) return { direction: 'stable', percentage: 0 };
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    const percentage = first > 0 ? ((diff / first) * 100).toFixed(1) : 0;
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      percentage: Math.abs(percentage),
      value: diff,
    };
  };
  
  return {
    sessions: sessionIds,
    trends: {
      totalStudents: calculateTrend(trends.totalStudents),
      paidOnTime: calculateTrend(trends.paidOnTime),
      paidInGrace: calculateTrend(trends.paidInGrace),
      unpaid: calculateTrend(trends.unpaid),
      defaulters: calculateTrend(trends.defaulters),
    },
    reports: reports.map((r, i) => ({
      sessionId: sessionIds[i],
      summary: r.summary,
    })),
  };
}

