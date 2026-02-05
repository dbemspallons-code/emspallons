// Simple offline queuing service for POST requests to Netlify Functions
// Usage:
// import { fetchWithQueue, triggerSync } from './offlineService';
// await fetchWithQueue('/.netlify/functions/generate-qr-token', { method: 'POST', body: JSON.stringify(payload) });

function openOutboxDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('bm-outbox-db', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addToOutbox(item) {
  const db = await openOutboxDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function fetchWithQueue(url, options = {}) {
  try {
    const res = await fetch(url, options);
    // If server responded with 503 and payload indicates offline, queue it
    if (res.status === 503) {
      const bodyText = options.body || null;
      await addToOutbox({ url, method: options.method || 'POST', headers: options.headers || { 'Content-Type': 'application/json' }, body: bodyText, timestamp: Date.now() });
      // Register sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-outbox');
      }
      return { offline: true };
    }
    return await res.json().catch(() => ({ ok: true }));
  } catch (err) {
    // Network error -> queue
    const bodyText = options.body || null;
    await addToOutbox({ url, method: options.method || 'POST', headers: options.headers || { 'Content-Type': 'application/json' }, body: bodyText, timestamp: Date.now() });
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('sync-outbox');
    }
    return { offline: true };
  }
}

export async function triggerSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    return reg.sync.register('sync-outbox');
  }
  // Fallback: send message to SW to trigger sync attempt
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' });
  }
}

export async function getOutboxLength() {
  const db = await openOutboxDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readonly');
    const store = tx.objectStore('outbox');
    const req = store.count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}
