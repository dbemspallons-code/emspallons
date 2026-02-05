/**
 * Service de stockage utilisant window.storage avec shared:true
 * Fallback sur IndexedDB si window.storage n'est pas disponible
 */

// Vérifier si window.storage existe (API expérimentale)
const hasWindowStorage = typeof window !== 'undefined' && window.storage && typeof window.storage.get === 'function';

/**
 * Stocke une valeur avec partage
 */
export async function setStorage(key, value, options = {}) {
  try {
    if (hasWindowStorage) {
      await window.storage.set(key, value, { shared: true, ...options });
    } else {
      // Fallback: utiliser IndexedDB pour le partage
      await setIndexedDB(key, value);
    }
  } catch (error) {
    console.error('Erreur setStorage:', error);
    // Fallback final: utiliser un objet global en mémoire
    if (typeof window !== 'undefined') {
      if (!window.__sharedStorage) window.__sharedStorage = {};
      window.__sharedStorage[key] = value;
    }
  }
}

/**
 * Récupère une valeur partagée
 */
export async function getStorage(key, defaultValue = null) {
  try {
    if (hasWindowStorage) {
      const value = await window.storage.get(key, { shared: true });
      return value !== undefined ? value : defaultValue;
    } else {
      // Fallback: IndexedDB
      const value = await getIndexedDB(key);
      return value !== undefined ? value : defaultValue;
    }
  } catch (error) {
    console.error('Erreur getStorage:', error);
    // Fallback final: objet global
    if (typeof window !== 'undefined' && window.__sharedStorage) {
      return window.__sharedStorage[key] !== undefined ? window.__sharedStorage[key] : defaultValue;
    }
    return defaultValue;
  }
}

/**
 * Supprime une clé
 */
export async function removeStorage(key) {
  try {
    if (hasWindowStorage) {
      await window.storage.delete(key, { shared: true });
    } else {
      await deleteIndexedDB(key);
    }
    if (typeof window !== 'undefined' && window.__sharedStorage) {
      delete window.__sharedStorage[key];
    }
  } catch (error) {
    console.error('Erreur removeStorage:', error);
  }
}

/**
 * Récupère toutes les clés
 */
export async function getAllKeys() {
  try {
    if (hasWindowStorage) {
      return await window.storage.keys({ shared: true });
    } else {
      return await getAllIndexedDBKeys();
    }
  } catch (error) {
    console.error('Erreur getAllKeys:', error);
    if (typeof window !== 'undefined' && window.__sharedStorage) {
      return Object.keys(window.__sharedStorage);
    }
    return [];
  }
}

/**
 * Efface tout le stockage partagé
 */
export async function clearStorage() {
  try {
    if (hasWindowStorage) {
      const keys = await getAllKeys();
      for (const key of keys) {
        await removeStorage(key);
      }
    } else {
      await clearIndexedDB();
    }
    if (typeof window !== 'undefined') {
      window.__sharedStorage = {};
    }
  } catch (error) {
    console.error('Erreur clearStorage:', error);
  }
}

// ==================== FALLBACK INDEXEDDB ====================

const DB_NAME = 'bus_management_shared';
const DB_VERSION = 1;
const STORE_NAME = 'shared_data';

let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

async function setIndexedDB(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ key, value, updatedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getIndexedDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : undefined);
    };
    request.onerror = () => reject(request.error);
  });
}

async function deleteIndexedDB(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getAllIndexedDBKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

