import React, { useMemo } from 'react';
import { Users, Bus, Wallet, Clock, AlertTriangle } from 'lucide-react';

export default function SummaryCards({ stats, students = [] }) {
  const total = stats?.total ?? 0;
  const byStatus = {
    up_to_date: 0,
    late: 0,
    out_of_service: 0,
    ...(stats?.byStatus || {}),
  };
  const estimatedRevenue = Number(stats?.estimatedRevenue ?? 0);
  const lines = stats?.lines ?? 0;
  
  // Calculer les étudiants expirant bientôt (dans 15 jours)
  const expiringSoon = useMemo(() => {
    if (!Array.isArray(students)) return 0;
    const now = new Date();
    const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    return students.filter(student => {
      const expirationDate = student.subscriptionExpiresAt ? new Date(student.subscriptionExpiresAt) : (student.subscription?.expiresAt ? new Date(student.subscription.expiresAt) : null);
      if (!expirationDate) return false;
      return expirationDate > now && expirationDate <= in15Days;
    }).length;
  }, [students]);
  
  return (
    <section className="summary-grid fade-in scroll-reveal">
      <SummaryCard icon={Users} accent="linear-gradient(135deg, #facc15 0%, #22c55e 100%)">
        <strong>{total}</strong>
        <span>Étudiants inscrits</span>
      </SummaryCard>
      <SummaryCard icon={Wallet} accent="linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)">
        <strong>{estimatedRevenue.toLocaleString('fr-FR')} F</strong>
        <span>Recettes estimées / mois</span>
      </SummaryCard>
      <SummaryCard icon={AlertTriangle} accent="linear-gradient(135deg, #fbbf24, #f97316)">
        <strong>{expiringSoon}</strong>
        <span>Expirent bientôt (≤15j)</span>
      </SummaryCard>
      <SummaryCard icon={Bus} accent="linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)">
        <strong>{lines}</strong>
        <span>Lignes actives</span>
      </SummaryCard>
    </section>
  );
}

function SummaryCard({ icon: Icon, accent, children }) {
  return (
    <article className="card summary-card fade-in stagger-item" style={{ backgroundImage: accent }}>
      {children}
      <Icon size={56} strokeWidth={1.4} />
    </article>
  );
}

