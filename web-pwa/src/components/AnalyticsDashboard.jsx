import React, { useMemo } from 'react';
import { BarChart2, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Users, Clock, CheckCircle } from 'lucide-react';
import { PAYMENT_STATUS } from '../models/entities';

export default function AnalyticsDashboard({ students = [] }) {
  // Animation scroll reveal pour le dashboard
  const analytics = useMemo(() => {
    const total = students.length;
    const byStatus = {
      [PAYMENT_STATUS.UP_TO_DATE]: 0,
      [PAYMENT_STATUS.LATE]: 0,
      [PAYMENT_STATUS.EXPIRED]: 0,
      [PAYMENT_STATUS.OUT_OF_SERVICE]: 0,
    };
    
    let totalRevenue = 0;
    let paidOnTime = 0;
    let paidLate = 0;
    let unpaid = 0;
    
    students.forEach(student => {
      if (student.paymentStatus) {
        byStatus[student.paymentStatus] = (byStatus[student.paymentStatus] || 0) + 1;
      }
      
      const monthlyFee = Number(student.monthlyFee) || 0;
      totalRevenue += monthlyFee;
      
      if (student.paymentStatus === PAYMENT_STATUS.UP_TO_DATE) {
        paidOnTime++;
      } else if (student.paymentStatus === PAYMENT_STATUS.LATE) {
        paidLate++;
      } else {
        unpaid++;
      }
    });
    
    const paymentRate = total > 0 ? ((paidOnTime / total) * 100).toFixed(1) : 0;
    const lateRate = total > 0 ? ((paidLate / total) * 100).toFixed(1) : 0;
    const unpaidRate = total > 0 ? ((unpaid / total) * 100).toFixed(1) : 0;
    
    // Calculer les tendances (comparaison avec le mois précédent - simulation)
    const trends = {
      revenue: '+12.5%',
      students: '+5.2%',
      paymentRate: '+2.1%',
      lateRate: '-1.5%',
    };
    
    return {
      total,
      byStatus,
      totalRevenue,
      paidOnTime,
      paidLate,
      unpaid,
      paymentRate,
      lateRate,
      unpaidRate,
      trends,
    };
  }, [students]);

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }} className="fade-in scroll-reveal">
      <div className="card fade-in" style={{ padding: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={20} /> Tableau de Bord Analytique
        </h3>
        
        {/* Indicateurs Clés */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <MetricCard
            icon={DollarSign}
            label="Revenus Mensuels"
            value={`${analytics.totalRevenue.toLocaleString('fr-FR')} FCFA`}
            trend={analytics.trends.revenue}
            color="#22c55e"
          />
          <MetricCard
            icon={Users}
            label="Total Étudiants"
            value={analytics.total}
            trend={analytics.trends.students}
            color="#3b82f6"
          />
          <MetricCard
            icon={CheckCircle}
            label="Taux de Paiement"
            value={`${analytics.paymentRate}%`}
            trend={analytics.trends.paymentRate}
            color="#10b981"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Taux d'Impayés"
            value={`${analytics.unpaidRate}%`}
            trend={analytics.trends.lateRate}
            color="#ef4444"
            isNegative
          />
        </div>

        {/* Graphique de Répartition */}
        <div className="card" style={{ padding: '1rem', background: '#f8fafc' }}>
          <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 600 }}>Répartition des Statuts</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <StatusBar
              label="À jour"
              value={analytics.paidOnTime}
              total={analytics.total}
              color="#22c55e"
            />
            <StatusBar
              label="En retard"
              value={analytics.paidLate}
              total={analytics.total}
              color="#f59e0b"
            />
            <StatusBar
              label="Impayés"
              value={analytics.unpaid}
              total={analytics.total}
              color="#ef4444"
            />
          </div>
        </div>

        {/* Alertes Visuelles */}
        {analytics.unpaid > 0 && (
          <div className="card" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
              <strong style={{ color: '#ef4444' }}>Attention : {analytics.unpaid} étudiant(s) en impayé</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Il est recommandé d'envoyer des rappels de paiement pour ces étudiants.
            </p>
          </div>
        )}

        {analytics.paidLate > 0 && (
          <div className="card" style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Clock size={18} style={{ color: '#f59e0b' }} />
              <strong style={{ color: '#f59e0b' }}>En retard : {analytics.paidLate} étudiant(s)</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Ces étudiants sont dans la période de grâce. Envoyez des rappels si nécessaire.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, trend, color, isNegative = false }) {
  const trendColor = isNegative ? (trend.startsWith('+') ? '#ef4444' : '#22c55e') : (trend.startsWith('+') ? '#22c55e' : '#ef4444');
  const TrendIcon = trend.startsWith('+') ? TrendingUp : TrendingDown;
  
  return (
    <div className="card" style={{ padding: '1rem', border: `2px solid ${color}20`, background: `${color}08` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <Icon size={20} style={{ color }} />
        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: trendColor }}>
        <TrendIcon size={12} />
        <span>{trend}</span>
      </div>
    </div>
  );
}

function StatusBar({ label, value, total, color }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ color: '#64748b' }}>{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

