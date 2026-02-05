E2E tests (template)

This folder contains templates for end-to-end tests to validate offline queueing and sync.

Recommended approach: use Playwright.

1) Install Playwright (in web-pwa):
   cd web-pwa
   npm install -D @playwright/test
   npx playwright install

2) Start local dev server and functions:
   npx netlify dev

3) Example test (offline.sync.spec.js) will simulate offline, call a small script that sends a queued POST via the app, then go online and verify the outbox is cleared.

Notes: The test templates require the app to expose a small helper on window for test use, or the test can directly exercise the UI that uses fetchWithQueue. Adjust as needed for your environment.