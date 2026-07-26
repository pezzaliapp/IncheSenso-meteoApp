const BASE_PATH = '/IncheSenso-meteoApp/';
const CACHE_NAME = 'meteo-it-v4';

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

// Host i cui dati cambiano continuamente: prima la rete, la cache solo da offline.
const LIVE_HOSTS = [
  'open-meteo.com',
  'rainviewer.com',
  'allertameteo.app',
  'nominatim.openstreetmap.org',
  'api.bigdatacloud.net'
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

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok && request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Le tile della mappa non vanno messe in cache: sono migliaia e scadono subito.
  if (url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('tilecache.rainviewer.com')) {
    return;
  }

  if (LIVE_HOSTS.some((host) => url.hostname.includes(host))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Il documento HTML va preso dalla rete quando possibile, altrimenti
  // dopo un deploy l'iPhone continua a mostrare la versione vecchia.
  if (request.mode === 'navigate' || (request.destination === 'document')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Tutto il resto (icone, Leaflet): cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      );
    })
  );
});
