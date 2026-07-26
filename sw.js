/* Percorso ricavato dalla posizione di questo file: funziona sia in una
   sottocartella (GitHub Pages) sia in radice (Netlify, Vercel, dominio proprio),
   e sopravvive a una rinomina del repository senza modifiche. */
const BASE_PATH = new URL('./', self.location).pathname;
const CACHE_NAME = 'meteo-it-v8';

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

/* La pagina ci parla: 'SKIP_WAITING' quando l'utente tocca Aggiorna,
   'GET_VERSION' per mostrare la versione in esecuzione nel footer. */
self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
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
