// Minimal service worker — exists only so the browser considers this app
// "installable" (Add to Home Screen / Install App). It intentionally does
// NOT cache API responses or pages: this dashboard shows live data
// (companies, events, drafts, replies) and a stale cache would show
// outdated numbers instead of a fresh fetch or a clear network error.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op: always let the browser handle the request normally (network).
});
