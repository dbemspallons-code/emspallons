const { test, expect } = require('@playwright/test');

// This is a minimal template. Adjust selectors and flows for your app.

test('offline queue -> sync', async ({ page, browser }) => {
  await page.goto('http://localhost:5173');

  // Ensure service worker ready
  await page.waitForFunction(() => !!navigator.serviceWorker && !!navigator.serviceWorker.controller);

  // Simulate offline
  await page.context().setOffline(true);

  // Use page.evaluate to call fetchWithQueue via the app (assumes fetchWithQueue is exported to window.__TEST__fetchWithQueue)
  const queued = await page.evaluate(async () => {
    if (!window.__TEST__fetchWithQueue) {
      return { error: 'Test helper missing. Expose fetchWithQueue as window.__TEST__fetchWithQueue in dev mode' };
    }
    const res = await window.__TEST__fetchWithQueue('/.netlify/functions/log-scan', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ studentId: '0000-TEST', status: 'PAID', controllerId: null })
    });
    return res;
  });

  expect(queued && queued.offline).toBeTruthy();

  // Go online and trigger sync
  await page.context().setOffline(false);
  await page.evaluate(async () => {
    // Trigger service worker sync (fallback message)
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' });
    }
    return true;
  });

  // Wait a bit for sync to process
  await page.waitForTimeout(3000);

  // Check outbox length via a test helper
  const remaining = await page.evaluate(async () => {
    if (!window.__TEST__getOutboxLength) return -1;
    return await window.__TEST__getOutboxLength();
  });

  expect(remaining).toBe(0);
});