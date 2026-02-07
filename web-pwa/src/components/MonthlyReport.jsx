import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';
import { getRevenusEncaisses, getRevenusComptabilises, calculateStudentStatus } from '../services/studentService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MonthlyReport({ selectedMonth, selectedYear, onMonthChange, onYearChange, students, payments, lines = [] }) {
  const [revenusEncaisses, setRevenusEncaisses] = useState({ total: 0, paiements: [] });
  const [revenusComptabilises, setRevenusComptabilises] = useState({ total: 0, paiements: [] });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ line: 'all', promo: 'all', classGroup: 'all' });

  const lineOptions = useMemo(() => {
    if (Array.isArray(lines) && lines.length) return lines;
    const values = new Set((students || []).map(s => s.busLine).filter(Boolean));
    return Array.from(values).map(value => ({ id: value, name: value }));
  }, [lines, students]);
  const promoOptions = useMemo(() => {
    const values = new Set();
    (students || []).forEach(student => {
      const value = (student?.promo || student?.niveau || '').trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);
  const classOptions = useMemo(() => {
    const values = new Set();
    (students || []).forEach(student => {
      const value = (student?.classe || student?.classGroup || '').trim();
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return (students || []).filter(student => {
      const matchLine = filters.line === 'all' || student?.busLine === filters.line;
      const matchPromo = filters.promo === 'all' || (student?.promo || student?.niveau || '').toLowerCase() === filters.promo.toLowerCase();
      const matchClass = filters.classGroup === 'all' || (student?.classe || student?.classGroup || '').toLowerCase() === filters.classGroup.toLowerCase();
      return matchLine && matchPromo && matchClass;
    });
  }, [students, filters]);

  const filteredPayments = useMemo(() => {
    const ids = new Set(filteredStudents.map(s => s.id));
    return (payments || []).filter(p => ids.has(p.studentId));
  }, [payments, filteredStudents]);

  const filteredEncaisses = useMemo(() => {
    const ids = new Set(filteredStudents.map(s => s.id));
    const paiements = (revenusEncaisses.paiements || []).filter(p => ids.has(p.studentId));
    const total = paiements.reduce((sum, p) => sum + (p.montantTotal || 0), 0);
    return { total, paiements };
  }, [revenusEncaisses, filteredStudents]);

  const filteredComptabilises = useMemo(() => {
    const ids = new Set(filteredStudents.map(s => s.id));
    const paiements = (revenusComptabilises.paiements || []).filter(p => ids.has(p.studentId));
    const total = paiements.reduce((sum, p) => sum + (p.montantMensuel || 0), 0);
    return { total, paiements };
  }, [revenusComptabilises, filteredStudents]);

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, payments]);

  async function loadData() {
    setLoading(true);
    try {
      const [encaisses, comptabilises] = await Promise.all([
        getRevenusEncaisses(selectedYear, selectedMonth),
        getRevenusComptabilises(selectedYear, selectedMonth),
      ]);
      setRevenusEncaisses(encaisses);
      setRevenusComptabilises(comptabilises);
    } catch (error) {
      console.error('Erreur chargement revenus:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculer les statistiques des Ã©tudiants
  const studentStats = useMemo(() => {
    const studentStatuses = filteredStudents.map(s => {
      const studentPayments = filteredPayments.filter(p => p.studentId === s.id);
      return calculateStudentStatus(s, studentPayments);
    });

    const actifs = studentStatuses.filter(s => {
      if (s.statut !== 'ACTIF' && s.statut !== 'EXPIRE_BIENTOT') return false;
      if (!s.dateFin) return false;
      const dateFin = new Date(s.dateFin);
      const moisDebut = new Date(selectedYear, selectedMonth - 1, 1);
      const moisFin = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
      return dateFin >= moisDebut && dateFin <= moisFin;
    }).length;

    const retard = studentStatuses.filter(s => s.statut === 'RETARD').length;
    const expire = studentStatuses.filter(s => s.statut === 'EXPIRE').length;

    return { actifs, retard, expire };
  }, [filteredStudents, filteredPayments, selectedMonth, selectedYear]);

  // DonnÃ©es pour le graphique
  const chartData = [
    {
      name: 'Revenus',
      'EncaissÃ©s': filteredEncaisses.total,
      'ComptabilisÃ©s': filteredComptabilises.total,
    },
  ];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SÃ©lecteur de mois */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(selectedYear, month - 1).toLocaleDateString('fr-FR', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 items-center">
          <select
            value={filters.line}
            onChange={(e) => setFilters(prev => ({ ...prev, line: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          >
            <option value="all">Toutes les lignes</option>
            {lineOptions.map(line => (
              <option key={line.id} value={line.id}>{line.name}</option>
            ))}
          </select>
          <select
            value={filters.promo}
            onChange={(e) => setFilters(prev => ({ ...prev, promo: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          >
            <option value="all">Toutes les promos</option>
            {promoOptions.map(promo => (
              <option key={promo} value={promo}>{promo}</option>
            ))}
          </select>
          <select
            value={filters.classGroup}
            onChange={(e) => setFilters(prev => ({ ...prev, classGroup: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
          >
            <option value="all">Toutes les classes</option>
            {classOptions.map(classe => (
              <option key={classe} value={classe}>{classe}</option>
            ))}
          </select>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            onClick={() => setFilters({ line: 'all', promo: 'all', classGroup: 'all' })}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Cartes de rÃ©sumÃ© */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenus encaissÃ©s</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {filteredEncaisses.total.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenus comptabilisÃ©s</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {filteredComptabilises.total.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Abonnements actifs</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {studentStats.actifs}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En retard / ExpirÃ©s</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {studentStats.retard + studentStats.expire}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Users className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Comparaison revenus</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => `${Number(value).toLocaleString('fr-FR')} FCFA`} />
            <Legend />
            <Bar dataKey="EncaissÃ©s" fill="#fbbf24" />
            <Bar dataKey="ComptabilisÃ©s" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* DÃ©tails des paiements encaissÃ©s */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Paiements encaissÃ©s ce mois</h3>
        {filteredEncaisses.paiements.length === 0 ? (
          <p className="text-gray-500">Aucun paiement encaissÃ© ce mois</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ã‰tudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEncaisses.paiements.map(payment => {
                  const student = filteredStudents.find(s => s.id === payment.studentId) || students.find(s => s.id === payment.studentId);
                  return (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.dateEnregistrement).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student ? `${student.nom} ${student.prenom}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.montantTotal.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.nombreMois} mois
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DÃ©tails des revenus comptabilisÃ©s */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Abonnements actifs ce mois (rÃ©partition mensuelle)</h3>
        {filteredComptabilises.paiements.length === 0 ? (
          <p className="text-gray-500">Aucun abonnement actif ce mois</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ã‰tudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PÃ©riode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant mensuel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredComptabilises.paiements.map(payment => {
                  const student = filteredStudents.find(s => s.id === payment.studentId) || students.find(s => s.id === payment.studentId);
                  return (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student ? `${student.nom} ${student.prenom}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.moisDebut).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} - {new Date(payment.moisFin).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.montantMensuel.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.montantTotal.toLocaleString('fr-FR')} FCFA ({payment.nombreMois} mois)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}





