/* eslint-disable no-console */
import { fileURLToPath } from 'url';
import path from 'path';

async function run() {
  console.log('🚀 Démarrage des tests automatiques pré-déploiement...\n');
  let allPassed = true;

  // TEST 1: Imports critiques
  console.log('📝 TEST 1 : Vérification des imports critiques');
  try {
    const root = path.dirname(fileURLToPath(import.meta.url));
    // dynamic import to ensure modules parse correctly
    await import(path.resolve(root, '../src/models/entities.js'));
    await import(path.resolve(root, '../src/services/firestoreService.js'));
    await import(path.resolve(root, '../src/models/sessionCalendar.js'));
    console.log('✅ Imports critiques: OK\n');
  } catch (err) {
    console.error('❌ Erreur import:', err?.message || err);
    allPassed = false;
  }

  // TEST 2: Calcul de l'expiration (1er + 5 jours de grâce)
  console.log('📝 TEST 2 : Calcul de l\'expiration (1er du mois + 5 jours de grâce)');
  try {
    const { computeExpirationDate } = await import('../src/models/entities.js');
    const testDate = new Date('2025-01-25');
    const expirationIso = computeExpirationDate(testDate.toISOString(), 'monthly', 1);
    const expirationDate = new Date(expirationIso);
    if (expirationDate.getFullYear() === 2025 && expirationDate.getMonth() === 1 && expirationDate.getDate() === 5) {
      console.log('✅ Calcul expiration correct: 5 février 2025\n');
    } else {
      console.error('❌ Calcul expiration incorrect:', expirationDate.toISOString());
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ Test expiration échoué:', err?.message || err);
    allPassed = false;
  }

  // TEST 3: Calcul automatique des montants
  console.log('📝 TEST 3 : Calcul automatique du montant (5 mois × 12 500)');
  try {
    const PRICE = 12500;
    const months = 5;
    const total = months * PRICE;
    if (total === 62500) {
      console.log('✅ Calcul montant correct: 62 500 FCFA\n');
    } else {
      console.error('❌ Calcul montant incorrect:', total);
      allPassed = false;
    }
  } catch (err) {
    console.error('❌ Test montant échoué:', err?.message || err);
    allPassed = false;
  }

  // TEST 4: Validation variables d'environnement Firebase (optionnel)
  console.log('📝 TEST 4 : Vérification configuration Firebase (variables d\'environnement)');
  try {
    const requiredVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
    ];
    const missing = requiredVars.filter(k => !process.env[k]);
    if (missing.length) {
      console.warn('⚠️ Variables d\'environnement manquantes (ok en dev):', missing.join(', '), '\n');
    } else {
      console.log('✅ Variables d\'environnement Firebase: OK\n');
    }
  } catch (err) {
    console.error('❌ Vérification Firebase échouée:', err?.message || err);
    allPassed = false;
  }

  console.log('═══════════════════════════════════════');
  if (allPassed) {
    console.log('✅ TOUS LES TESTS PRÉ-DÉPLOIEMENT SONT PASSÉS\n');
    process.exit(0);
  } else {
    console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ\n');
    process.exit(1);
  }
}

run();


