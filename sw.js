const BASE_PATH = '/IncheSenso-meteoApp/';
const CACHE_NAME = 'meteo-er-v2';

const STATIC_ASSETS = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}icons/icon-72x72.svg`,
  `${BASE_PATH}icons/icon-96x96.svg`,
  `${BASE_PATH}icons/icon-128x128.svg`,
  `${BASE_PATH}icons/icon-144x144.svg`,
  `${BASE_PATH}icons/icon-152x152.svg`,
  `${BASE_PATH}icons/icon-192x192.svg`,
  `${BASE_PATH}icons/icon-384x384.svg`,
  `${BASE_PATH}icons/icon-512x512.svg`,
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('rainviewer.com') ||
    url.hostname.includes('allertameteo.app')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response.ok && request.method === 'GET') {
            const clone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }

          return response;
        })
      );
    })
  );
});
