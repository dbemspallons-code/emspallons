import { getInitialStudent, BUS_LINES, PAYMENT_STATUS, SUBSCRIPTION_PLANS } from '../models/entities';

/**
 * Parse un fichier CSV et retourne un tableau d'étudiants
 * @param {File} file - Fichier CSV à parser
 * @returns {Promise<Array>} Tableau d'étudiants parsés
 */
export async function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('Le fichier CSV doit contenir au moins une ligne d\'en-tête et une ligne de données.'));
          return;
        }
        
        // Parser la première ligne comme en-têtes
        const headers = parseCSVLine(lines[0]);
        const students = [];
        
        // Parser les lignes de données
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length === 0 || values.every(v => !v.trim())) continue; // Ignorer les lignes vides
          
          try {
            const student = parseCSVRow(headers, values, i + 1);
            if (student) {
              students.push(student);
            }
          } catch (err) {
            console.warn(`Erreur parsing ligne ${i + 1}:`, err);
            // Continuer avec les autres lignes
          }
        }
        
        resolve(students);
      } catch (error) {
        reject(new Error(`Erreur lors du parsing du CSV: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier.'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Parse une ligne CSV en tenant compte des guillemets et des virgules
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Guillemet échappé
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Fin d'une valeur
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Ajouter la dernière valeur
  values.push(current.trim());
  
  return values;
}

/**
 * Parse une ligne de données CSV en objet étudiant
 */
function parseCSVRow(headers, values, lineNumber) {
  const row = {};
  
  // Créer un objet avec les valeurs indexées par les en-têtes
  headers.forEach((header, index) => {
    const value = values[index] || '';
    // Enlever les guillemets si présents
    const cleanValue = value.replace(/^"|"$/g, '').trim();
    row[header] = cleanValue;
  });
  
  // Valider les champs requis
  if (!row.name || !row.contact) {
    throw new Error(`Ligne ${lineNumber}: Le nom et le contact sont requis.`);
  }
  
  // Créer un étudiant avec les données parsées
  const student = getInitialStudent({
    name: row.name,
    contact: row.contact,
    classGroup: row.classGroup || '',
    busLine: row.busLine || BUS_LINES[0].id,
    guardian: row.guardian || '',
    pickupPoint: row.pickupPoint || '',
    niveau: row.niveau || '',
    subscriptionPlan: row.subscriptionPlan || 'monthly',
    monthlyFee: parseFloat(row.monthlyFee) || 0,
    paymentStatus: row.paymentStatus || PAYMENT_STATUS.UP_TO_DATE,
    notes: row.notes || '',
  });
  
  // Gérer les dates si présentes
  if (row.createdAt) {
    try {
      const date = new Date(row.createdAt);
      if (!isNaN(date.getTime())) {
        student.audit.createdAt = date.toISOString();
      }
    } catch (err) {
      console.warn(`Date invalide pour createdAt ligne ${lineNumber}:`, row.createdAt);
    }
  }
  
  // Gérer monthsPaid si présent
  if (row.monthsPaid) {
    try {
      const monthsPaid = row.monthsPaid.split('|').filter(m => m.trim());
      student.monthsPaid = monthsPaid;
    } catch (err) {
      console.warn(`Erreur parsing monthsPaid ligne ${lineNumber}:`, err);
    }
  }
  
  return student;
}

/**
 * Importe des étudiants depuis un fichier CSV
 * @param {File} file} - Fichier CSV
 * @param {Function} onProgress - Callback de progression (optionnel)
 * @returns {Promise<Array>} Tableau d'étudiants importés
 */
export async function importStudentsFromCSV(file, onProgress) {
  if (!file) {
    throw new Error('Aucun fichier sélectionné.');
  }
  
  if (!file.name.endsWith('.csv')) {
    throw new Error('Le fichier doit être au format CSV (.csv).');
  }
  
  try {
    if (onProgress) onProgress({ status: 'parsing', message: 'Analyse du fichier CSV...' });
    
    const students = await parseCSVFile(file);
    
    if (students.length === 0) {
      throw new Error('Aucun étudiant trouvé dans le fichier CSV.');
    }
    
    if (onProgress) {
      onProgress({ 
        status: 'success', 
        message: `${students.length} étudiant(s) trouvé(s) dans le fichier.`,
        count: students.length 
      });
    }
    
    return students;
  } catch (error) {
    if (onProgress) {
      onProgress({ status: 'error', message: error.message });
    }
    throw error;
  }
}

