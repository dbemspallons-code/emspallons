/**
 * Service d'export/import CSV et JSON
 */

import { getAllStudents, getAllPayments, calculateStudentStatus } from './studentService';
import { getAllUsers } from './authService';

function detectDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function toCsvContent(headers, rows, delimiter = ';') {
  const escapeCell = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  return [
    headers.join(delimiter),
    ...rows.map(row => row.map(escapeCell).join(delimiter))
  ].join('\n');
}

function normalizeHeaderKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function mapRowToStudent(record) {
  return {
    nom: record.nom || record.name || '',
    prenom: record.prenom || record.firstname || record.first_name || '',
    promo: record.promo || record.niveau || '',
    classe: record.classe || record.class || record.classgroup || '',
    busLine: record.ligne || record.busline || record.bus_line || record.buslineid || '',
    contact: record.contact || record.telephone || record.phone || '',
    notes: record.notes || '',
  };
}

async function loadXlsx() {
  const XLSX = await import('xlsx');
  return XLSX;
}

/**
 * Exporte tous les etudiants en CSV (compatible Excel).
 * - Si "students" est fourni, exporte la liste filtrée.
 * - Si "lines" est fourni, remplace l'ID de ligne par son nom.
 */
export async function exportStudentsCSV({ students: studentsOverride, payments: paymentsOverride, lines = [] } = {}) {
  const students = studentsOverride || await getAllStudents();
  const payments = paymentsOverride || await getAllPayments();
  const lineLookup = Object.fromEntries((lines || []).map(line => [line.id, line]));

  const headers = [
    'ID',
    'Nom',
    'Prenom',
    'Promo',
    'Classe',
    'Ligne',
    'Statut',
    'Contact',
    'Date creation',
    'Cree par',
    'Notes',
  ];

  const rows = students.map(student => {
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const status = calculateStudentStatus(student, studentPayments);
    const lineLabel = lineLookup[student.busLine]?.name || student.busLine || '';

    return [
      student.id,
      student.nom,
      student.prenom || '',
      student.promo || student.niveau || '',
      student.classe || student.classGroup || '',
      lineLabel,
      status?.message || '',
      student.contact || '',
      student.dateCreation || '',
      student.creePar?.nom || '',
      student.notes || '',
    ];
  });

  const csvContent = toCsvContent(headers, rows, ';');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `etudiants_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

/**
 * Exporte tous les etudiants en XLSX (Excel).
 */
export async function exportStudentsXLSX({ students: studentsOverride, payments: paymentsOverride, lines = [] } = {}) {
  const students = studentsOverride || await getAllStudents();
  const payments = paymentsOverride || await getAllPayments();
  const lineLookup = Object.fromEntries((lines || []).map(line => [line.id, line]));
  const XLSX = await loadXlsx();

  const headers = [
    'ID',
    'Nom',
    'Prenom',
    'Promo',
    'Classe',
    'Ligne',
    'Statut',
    'Contact',
    'Date creation',
    'Cree par',
    'Notes',
  ];

  const rows = students.map(student => {
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const status = calculateStudentStatus(student, studentPayments);
    const lineLabel = lineLookup[student.busLine]?.name || student.busLine || '';

    return [
      student.id,
      student.nom,
      student.prenom || '',
      student.promo || student.niveau || '',
      student.classe || student.classGroup || '',
      lineLabel,
      status?.message || '',
      student.contact || '',
      student.dateCreation || '',
      student.creePar?.nom || '',
      student.notes || '',
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Etudiants');
  XLSX.writeFile(workbook, `etudiants_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Exporte tous les paiements en CSV (compatible Excel)
 */
export async function exportPaymentsCSV() {
  const students = await getAllStudents();
  const payments = await getAllPayments();

  const headers = [
    'ID',
    'ID Etudiant',
    'Nom Etudiant',
    'Montant Total',
    'Nombre Mois',
    'Montant Mensuel',
    'Date Debut',
    'Date Fin',
    'Date Grace Fin',
    'Date Enregistrement',
    'Educateur',
    'Description',
  ];

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

  const csvContent = toCsvContent(headers, rows, ';');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

/**
 * Exporte tous les paiements en XLSX (Excel)
 */
export async function exportPaymentsXLSX() {
  const students = await getAllStudents();
  const payments = await getAllPayments();
  const XLSX = await loadXlsx();

  const headers = [
    'ID',
    'ID Etudiant',
    'Nom Etudiant',
    'Montant Total',
    'Nombre Mois',
    'Montant Mensuel',
    'Date Debut',
    'Date Fin',
    'Date Grace Fin',
    'Date Enregistrement',
    'Educateur',
    'Description',
  ];

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

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Paiements');
  XLSX.writeFile(workbook, `paiements_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Exporte toutes les donnees en JSON
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
    users: users.map(({ motDePasse, ...user }) => user),
  };

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `backup_complet_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
}

/**
 * Importe des donnees depuis un fichier JSON
 */
export async function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data.students || !Array.isArray(data.students)) {
          throw new Error('Format JSON invalide: etudiants manquants');
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
 * Importe des etudiants depuis un fichier CSV
 * Accepte les CSV Excel avec separateur ; ou ,
 */
export async function importStudentsCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          throw new Error('Le fichier CSV doit contenir au moins un en-tete et une ligne de donnees');
        }

        const delimiter = detectDelimiter(lines[0]);
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        const headerKeys = headers.map(normalizeHeaderKey);

        const students = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
          if (values.length !== headers.length) continue;

          const record = {};
          headerKeys.forEach((key, index) => {
            record[key] = values[index] || '';
          });

          students.push(mapRowToStudent(record));
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


/**
 * Importe des etudiants depuis un fichier XLSX (Excel)
 */
export async function importStudentsXLSX(file) {
  const XLSX = await loadXlsx();
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Fichier Excel vide');
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows.length) {
    throw new Error('Fichier Excel vide');
  }

  const headers = rows[0].map(cell => String(cell || '').trim());
  const headerKeys = headers.map(normalizeHeaderKey);

  const students = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (!values || values.length === 0) continue;

    const record = {};
    headerKeys.forEach((key, index) => {
      record[key] = values[index] ?? '';
    });

    const mapped = mapRowToStudent(record);
    if (!mapped.nom && !mapped.prenom && !mapped.contact) continue;
    students.push(mapped);
  }

  return students;
}
