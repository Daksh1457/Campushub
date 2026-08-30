/**
 * CampusHub 1.0 — Cache-First PWA Service Worker
 */

const CACHE_NAME = 'campushub-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/store.js',
  './js/mockData.js',
  './js/supabaseClient.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).then(() => {
        return Promise.all(
          FONT_URLS.map(url =>
            fetch(url).then(resp => {
              if (resp.ok) {
                return resp.text().then(css => {
                  cache.put(url, new Response(css, { headers: { 'Content-Type': 'text/css' } }));
                  const fontMatches = css.match(/url\((https?:\/\/[^)]+)\)/g) || [];
                  return Promise.all(
                    fontMatches.map(match => {
                      const fontUrl = match.replace(/url\((.*)\)/, '$1');
                      return fetch(fontUrl).then(r => {
                        if (r.ok) return cache.put(fontUrl, r);
                      }).catch(() => {});
                    })
                  );
                });
              }
            }).catch(() => {})
          )
        );
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Don't cache Supabase API calls or auth requests
  if (e.request.url.includes('supabase.co')) {
    return;
  }
  e.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(e.request).then(cached => {
        return cached || fetch(e.request);
      });
    })
  );
});
