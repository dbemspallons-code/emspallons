/**
 * Service d'export/import CSV et JSON
 */

import { getAllStudents, getAllPayments } from './studentService';
import { getAllUsers } from './authService';

/**
 * Exporte tous les étudiants en CSV
 */
export async function exportStudentsCSV() {
  const students = await getAllStudents();
  const payments = await getAllPayments();

  // En-têtes
  const headers = [
    'ID',
    'Nom',
    'Prénom',
    'Classe',
    'Contact',
    'Date création',
    'Créé par',
    'Notes',
  ];

  // Lignes
  const rows = students.map(student => [
    student.id,
    student.nom,
    student.prenom || '',
    student.classe || '',
    student.contact || '',
    student.dateCreation || '',
    student.creePar?.nom || '',
    student.notes || '',
  ]);

  // Créer le CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Télécharger
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `etudiants_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

/**
 * Exporte tous les paiements en CSV
 */
export async function exportPaymentsCSV() {
  const students = await getAllStudents();
  const payments = await getAllPayments();

  // En-têtes
  const headers = [
    'ID',
    'ID Étudiant',
    'Nom Étudiant',
    'Montant Total',
    'Nombre Mois',
    'Montant Mensuel',
    'Date Début',
    'Date Fin',
    'Date Grâce Fin',
    'Date Enregistrement',
    'Éducateur',
    'Description',
  ];

  // Lignes
  const rows = payments.map(payment => {
    const student = students.find(s => s.id === payment.studentId);
    return [
      payment.id,
      payment.studentId,
      student ? `${student.nom} ${student.prenom}` : '',
      payment.montantTotal,
      payment.nombreMois,
      payment.montantMensuel,
      payment.moisDebut,
      payment.moisFin,
      payment.dateGraceFin,
      payment.dateEnregistrement,
      payment.educateurNom || '',
      payment.description || '',
    ];
  });

  // Créer le CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Télécharger
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

/**
 * Exporte toutes les données en JSON
 */
export async function exportAllJSON() {
  const [students, payments, users] = await Promise.all([
    getAllStudents(),
    getAllPayments(),
    getAllUsers(),
  ]);

  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    students,
    payments,
    users: users.map(({ motDePasse, ...user }) => user), // Ne pas exporter les mots de passe
  };

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `backup_complet_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
}

/**
 * Importe des données depuis un fichier JSON
 */
export async function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Valider la structure
        if (!data.students || !Array.isArray(data.students)) {
          throw new Error('Format JSON invalide: étudiants manquants');
        }
        if (!data.payments || !Array.isArray(data.payments)) {
          throw new Error('Format JSON invalide: paiements manquants');
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsText(file);
  });
}

/**
 * Importe des étudiants depuis un fichier CSV
 */
export async function importStudentsCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('Le fichier CSV doit contenir au moins un en-tête et une ligne de données');
        }

        // Parser les en-têtes
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Parser les données
        const students = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          if (values.length !== headers.length) continue;
          
          const student = {};
          headers.forEach((header, index) => {
            student[header.toLowerCase().replace(/\s+/g, '')] = values[index] || '';
          });
          
          // Normaliser les champs
          students.push({
            nom: student.nom || '',
            prenom: student.prénom || student.prenom || '',
            classe: student.classe || '',
            contact: student.contact || '',
            notes: student.notes || '',
          });
        }

        resolve(students);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsText(file);
  });
}

