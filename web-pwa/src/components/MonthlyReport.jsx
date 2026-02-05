import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';
import { getRevenusEncaisses, getRevenusComptabilises, calculateStudentStatus } from '../services/studentService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MonthlyReport({ selectedMonth, selectedYear, onMonthChange, onYearChange, students, payments }) {
  const [revenusEncaisses, setRevenusEncaisses] = useState({ total: 0, paiements: [] });
  const [revenusComptabilises, setRevenusComptabilises] = useState({ total: 0, paiements: [] });
  const [loading, setLoading] = useState(true);

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

  // Calculer les statistiques des étudiants
  const studentStats = useMemo(() => {
    const studentStatuses = students.map(s => {
      const studentPayments = payments.filter(p => p.studentId === s.id);
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
  }, [students, payments, selectedMonth, selectedYear]);

  // Données pour le graphique
  const chartData = [
    {
      name: 'Revenus',
      'Encaissés': revenusEncaisses.total,
      'Comptabilisés': revenusComptabilises.total,
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
      {/* Sélecteur de mois */}
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
      </div>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenus encaissés</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {revenusEncaisses.total.toLocaleString('fr-FR')} FCFA
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
              <p className="text-sm font-medium text-gray-600">Revenus comptabilisés</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {revenusComptabilises.total.toLocaleString('fr-FR')} FCFA
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
              <p className="text-sm font-medium text-gray-600">En retard / Expirés</p>
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
            <Bar dataKey="Encaissés" fill="#fbbf24" />
            <Bar dataKey="Comptabilisés" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Détails des paiements encaissés */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Paiements encaissés ce mois</h3>
        {revenusEncaisses.paiements.length === 0 ? (
          <p className="text-gray-500">Aucun paiement encaissé ce mois</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenusEncaisses.paiements.map(payment => {
                  const student = students.find(s => s.id === payment.studentId);
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

      {/* Détails des revenus comptabilisés */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Abonnements actifs ce mois (répartition mensuelle)</h3>
        {revenusComptabilises.paiements.length === 0 ? (
          <p className="text-gray-500">Aucun abonnement actif ce mois</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant mensuel</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenusComptabilises.paiements.map(payment => {
                  const student = students.find(s => s.id === payment.studentId);
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

