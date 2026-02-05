/**
 * Service de synchronisation Firestore
 * Remplace les services localStorage pour la synchronisation multi-appareils
 */

import { ensureFirestore } from './firestoreService';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Récupère un étudiant par ID depuis Firestore
 */
export async function getStudentByIdFromFirestore(studentId) {
  const db = ensureFirestore();
  if (!db) {
    console.warn('Firestore non disponible');
    return null;
  }
  
  try {
    const studentRef = doc(db, 'students', studentId);
    const studentSnap = await getDoc(studentRef);
    
    if (!studentSnap.exists()) {
      return null;
    }
    
    const data = studentSnap.data();
    return {
      id: studentSnap.id,
      ...data,
    };
  } catch (error) {
    console.error('Erreur récupération étudiant depuis Firestore:', error);
    return null;
  }
}

/**
 * Récupère tous les contrôleurs depuis Firestore
 */
export async function getAllControllersFromFirestore() {
  const db = ensureFirestore();
  if (!db) {
    console.warn('Firestore non disponible');
    return [];
  }
  
  try {
    const controllersRef = collection(db, 'controllers');
    const snapshot = await getDocs(controllersRef);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
      };
    });
  } catch (error) {
    console.error('Erreur récupération contrôleurs depuis Firestore:', error);
    return [];
  }
}

/**
 * Récupère un contrôleur par code depuis Firestore
 */
export async function getControllerByCodeFromFirestore(accessCode) {
  const db = ensureFirestore();
  if (!db) {
    console.warn('Firestore non disponible');
    return null;
  }
  
  try {
    const controllersRef = collection(db, 'controllers');
    const code = (accessCode || '').trim().toUpperCase();
    
    // Chercher par code
    const q = query(controllersRef, where('code', '==', code));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    
    return {
      id: docSnap.id,
      ...data,
    };
  } catch (error) {
    console.error('Erreur récupération contrôleur depuis Firestore:', error);
    return null;
  }
}

