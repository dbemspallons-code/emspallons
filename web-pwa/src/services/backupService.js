/**
 * Service de sauvegarde automatique
 * Gère les backups quotidiens et la restauration
 */

import { supabase } from '../supabase/supabaseClient';
import { exportSubscribersCSV } from './exportCSV';

const BACKUP_STORAGE_KEY = 'bus_backup_history';
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Crée un backup de tous les étudiants
 */
export async function createBackup() {
  try {
    const { data: students, error } = await supabase.from('subscribers').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    const mapped = (students || []).map(s => ({ id: s.id, name: s.name, contact: s.phone || s.email || '', classGroup: s.class || '', busLine: s.bus_line || '', monthlyFee: s.monthly_fee || 0, paymentStatus: s.status || '', audit: { createdAt: s.created_at } }));

    const backup = {
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('fr-FR'),
      students: mapped,
      count: mapped.length,
    };

    // Sauvegarder dans le localStorage (history local for quick access)
    const history = getBackupHistory();
    history.unshift(backup);
    if (history.length > 30) history.pop();
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(history));

    return backup;
  } catch (error) {
    console.error('Erreur création backup (Supabase):', error);
    throw error;
  }
}

/**
 * Récupère l'historique des backups
 */
export function getBackupHistory() {
  try {
    const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Erreur récupération historique backups:', error);
    return [];
  }
}

/**
 * Exporte un backup en CSV
 */
export async function exportBackupToCSV(backup) {
  try {
    const csvData = backup.students.map(student => ({
      name: student.name || '',
      contact: student.contact || '',
      guardian: student.guardian || '',
      classGroup: student.classGroup || '',
      busLine: student.busLine || '',
      monthlyFee: student.monthlyFee || 0,
      paymentStatus: student.paymentStatus || '',
      createdAt: student.audit?.createdAt ? new Date(student.audit.createdAt).toLocaleDateString('fr-FR') : '',
    }));

    await exportSubscribersCSV(csvData, `backup-${backup.date.replace(/\//g, '-')}.csv`);
    return true;
  } catch (error) {
    console.error('Erreur export backup CSV:', error);
    throw error;
  }
}

/**
 * Vérifie si un backup doit être créé (quotidien)
 */
export function shouldCreateBackup() {
  const lastBackup = getLastBackupDate();
  if (!lastBackup) return true;

  const now = Date.now();
  const lastBackupTime = new Date(lastBackup).getTime();
  return (now - lastBackupTime) >= BACKUP_INTERVAL;
}

/**
 * Récupère la date du dernier backup
 */
function getLastBackupDate() {
  const history = getBackupHistory();
  return history.length > 0 ? history[0].timestamp : null;
}

/**
 * Initialise le système de backup automatique
 */
export function initAutomaticBackup() {
  // Vérifier toutes les heures si un backup doit être créé
  setInterval(async () => {
    if (shouldCreateBackup()) {
      try {
        await createBackup();
        console.log('Backup automatique créé avec succès');
      } catch (error) {
        console.warn('Erreur backup automatique:', error);
      }
    }
  }, 60 * 60 * 1000); // Vérifier toutes les heures
}

