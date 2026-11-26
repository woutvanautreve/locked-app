// Zorgt dat de app ook zonder internet werkt, en opent de app als je op een melding tikt.
const CACHE = 'planner-v21';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-v2-180.png', 'icon-v2-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Eerst internet proberen (zodat updates binnenkomen), anders de opgeslagen versie.
// cache: 'no-cache' = altijd bij GitHub nakijken of er een nieuwere versie is (anders kan je tot 10 min een oude krijgen).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // database (Supabase) nooit opslaan
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});

// Pushmelding van de server (Supabase) tonen, ook als LOCKED dicht is
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'LOCKED', {
    body: d.body || '', icon: 'icon-v2-180.png', badge: 'icon-v2-180.png', tag: d.tag || 'locked', renotify: true
  }));
});

// Tik op de melding "Rust voorbij" -> terug naar LOCKED
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./');
    })
  );
});
