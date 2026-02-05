const CACHE_NAME = 'emsp-allons-cache-v4';
const ASSETS_TO_CACHE = ['/','/index.html','/styles.css'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Fetch: network-first for navigation, cache-first for static assets.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Navigation requests (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Don't handle cross-origin or non-GET here (client handles POST queueing)
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // Static assets - cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
      }
      return res;
    }).catch(() => caches.match('/index.html')))
  );
});

// --- Outbox (IndexedDB) helpers inside service worker ---
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

async function getOutboxItems() {
  const db = await openOutboxDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readonly');
    const store = tx.objectStore('outbox');
    const all = store.getAll();
    all.onsuccess = () => resolve(all.result || []);
    all.onerror = () => reject(all.error);
  });
}

async function clearOutboxItem(id) {
  const db = await openOutboxDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite');
    const store = tx.objectStore('outbox');
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// Sync event: flush outbox
self.addEventListener('sync', event => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil((async () => {
      const items = await getOutboxItems();
      for (const it of items) {
        try {
          await fetch(it.url, { method: it.method, headers: it.headers, body: it.body });
          await clearOutboxItem(it.id);
          // notify clients that an item was synced
          const allClients = await self.clients.matchAll({ includeUncontrolled: true });
          for (const client of allClients) {
            client.postMessage({ type: 'OUTBOX_ITEM_SYNCED', id: it.id });
          }
        } catch (err) {
          // Leave for next sync
        }
      }
      // Send remaining count
      const remaining = (await getOutboxItems()).length;
      const allClients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({ type: 'OUTBOX_SYNC_COMPLETE', remaining });
      }
    })());
  }
});

// Allow clients to trigger a sync via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    self.registration.sync.register('sync-outbox').catch(() => {});
  }
});