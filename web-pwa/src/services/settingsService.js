/**
 * Service de gestion des paramètres globaux
 * Montant mensuel par défaut modifiable par l'admin
 */

import { getStorage, setStorage } from './storageService';

const SETTINGS_KEY = 'app_settings';
const DEFAULT_MONTHLY_FEE = 12500; // FCFA
const DEFAULT_CONTROLLER_CODE = '1234-5678-9012';

/**
 * Récupère les paramètres de l'application
 */
export async function getSettings() {
  try {
    const settings = await getStorage(SETTINGS_KEY, {});
    return {
      defaultMonthlyFee: settings.defaultMonthlyFee || DEFAULT_MONTHLY_FEE,
      alertThreshold: settings.alertThreshold || 15,
      controllerAccessCode: settings.controllerAccessCode || DEFAULT_CONTROLLER_CODE,
      controllerName: settings.controllerName || 'Contrôleur',
      ...settings,
    };
  } catch (error) {
    console.error('Erreur getSettings:', error);
    return {
      defaultMonthlyFee: DEFAULT_MONTHLY_FEE,
      alertThreshold: 15,
      controllerAccessCode: DEFAULT_CONTROLLER_CODE,
      controllerName: 'Contrôleur',
    };
  }
}

/**
 * Met à jour les paramètres
 */
export async function updateSettings(newSettings) {
  try {
    const current = await getSettings();
    const updated = {
      ...current,
      ...newSettings,
    };
    await setStorage(SETTINGS_KEY, updated);
    return updated;
  } catch (error) {
    console.error('Erreur updateSettings:', error);
    throw error;
  }
}

/**
 * Récupère le montant mensuel par défaut
 */
export async function getDefaultMonthlyFee() {
  const settings = await getSettings();
  return settings.defaultMonthlyFee || DEFAULT_MONTHLY_FEE;
}

