# 🌩️ IncheSenso Meteo — PWA Previsioni & Allerte

Una Progressive Web App gratuita e open source per il monitoraggio meteo, radar temporali e allerte Protezione Civile in **tutti i 7.904 comuni italiani**, in base alla posizione rilevata. Nessuna API key richiesta.

![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-Ready-blue)

## ✨ Funzionalità

- **🌤️ Previsioni meteo** — Correnti, orarie 24h e giornaliere 7 giorni (Open-Meteo)
- **🌐 Radar temporali** — Mappa animata con sovrapposizione radar RainViewer, legenda Azzurro/Giallo/Rosso per intensità
- **🚨 Allerte per comune** — Dati ufficiali DPC per oggi e domani, con dettaglio rischio temporali/idraulico/idrogeologico
- **🧊 Alert grandine** — Indicatore di rischio basato su allerte + codice meteo WMO
- **🔔 Notifiche push** — Avvisi del browser quando cambia il livello di allerta
- **📍 Geolocalizzazione** — All'avvio rileva la posizione, risale al comune e carica le allerte di quel comune
- **🔎 Ricerca nazionale** — Cerca qualsiasi comune italiano per nome
- **📲 Installabile** — Funziona come app nativa su Android, iOS e desktop
- **🌐 Offline** — Service worker con caching per funzionare anche senza connessione

## 🚀 Demo

Carica i file su GitHub Pages, Netlify, Vercel o qualsiasi hosting statico. L'app funziona immediatamente senza configurazione.

## 🛠️ Installazione locale

```bash
git clone https://github.com/pezzaliapp/IncheSenso-meteoApp.git
cd IncheSenso-meteoApp
# Apri index.html in un browser, oppure usa un server locale:
npx serve .
```

## 📦 Struttura progetto

```
IncheSenso-meteoApp/
├── index.html          # App principale
├── manifest.json       # Configurazione PWA
├── sw.js               # Service Worker (cache + offline)
├── icons/
│   └── icon-*.svg      # Icone responsive SVG
└── README.md           # Questo file
```

## 🔌 API utilizzate

| Servizio | Dato | Costo |
|----------|------|-------|
| [Open-Meteo](https://open-meteo.com) | Previsioni meteo | Gratuito, no key |
| [RainViewer](https://www.rainviewer.com/api.html) | Tiles radar | Gratuito, no key |
| [Allerta Meteo Italia](https://allertameteo.app) | Allerte DPC per comune (tutta Italia) | Gratuito, no key |
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | Ricerca comune per nome | Gratuito, no key |
| [Nominatim](https://nominatim.openstreetmap.org) | Posizione GPS → comune | Gratuito, [usage policy](https://operations.osmfoundation.org/policies/nominatim/) |

## 🚦 Semaforo temporali

Il semaforo sintetizza in tempo reale:
1. **Livello allerta DPC** per il comune (verde/giallo/arancione/rosso)
2. **Codice meteo WMO** attuale (grandine = 96/99)

| Colore | Significato |
|--------|-------------|
| 🔵 Azzurro | Condizioni tranquille |
| 🟡 Giallo | Temporali moderati / Allerta gialla |
| 🔴 Rosso | Temporali forti / Grandine / Allerta arancione o rossa |

## 🔔 Notifiche

Attiva il toggle "Notifiche allerte" nel browser. L'app controlla ogni 10 minuti e invia una notifica push se il livello di allerta sale per il comune selezionato.

## 📱 Installazione come app

- **Android (Chrome)**: Menu ⋮ → "Aggiungi a schermata Home"
- **iOS (Safari)**: Condividi ⬆️ → "Aggiungi alla schermata Home"
- **Desktop**: Chrome/Edge → Menu ⋮ → "Installa IncheSenso"

## 📝 Licenza

MIT License — libero uso, modifica e distribuzione.

## 🗺️ Nota sullo zoom del radar

I tile radar gratuiti di RainViewer sono generati solo fino a un certo livello di
zoom; oltre quello il server restituisce un'immagine con la scritta
*"Zoom Level Not Supported"*. Per questo il livello radar è configurato con
`maxNativeZoom` (costante `RADAR_MAX_NATIVE_ZOOM` in `index.html`): Leaflet non
chiede mai tile oltre quel livello e riscala l'ultimo disponibile, così la
scritta non può comparire. Se RainViewer alzerà il limite, basta alzare la
costante.

## ⚖️ Attribuzioni e limiti d'uso

Le fonti sono citate nel footer dell'app, come richiesto dalle rispettive licenze
(Open-Meteo richiede l'attribuzione CC BY 4.0). Nota che:

- **Open-Meteo** e **RainViewer** sono gratuiti per uso **non commerciale**
  (siti o app privati/no-profit, senza abbonamenti né pubblicità).
- **Nominatim** (posizione GPS → comune) ha limiti che valgono *per applicazione*,
  non per utente: massimo 1 richiesta al secondo sommando tutti gli utenti.
  Con un numero moderato di utenti va bene; a volumi maggiori serve un altro
  geocoder o un'istanza propria.
- Le **tile OSM** sono infrastruttura donata: la normale navigazione interattiva è
  consentita, il prefetch e la cache per uso offline no. Per questo il service
  worker esclude esplicitamente le tile dalla cache.
- L'animazione radar viene messa in pausa quando la mappa esce dallo schermo o
  l'app va in background, per non scaricare tile inutilmente.

## 🔄 Come pubblicare un aggiornamento

L'app avvisa gli utenti da sola. Il flusso è questo:

1. Modifica i file (`index.html`, `sw.js`, ...).
2. **Incrementa `CACHE_NAME` in `sw.js`** (es. da `meteo-it-v8` a `meteo-it-v9`).
   È l'unico passaggio obbligatorio: il browser rileva un aggiornamento solo se
   il file `sw.js` cambia nei byte.
3. Fai il commit e il push.

Chi ha l'app aperta vede comparire in basso la barra **"È disponibile una nuova
versione — Aggiorna"**: al tocco il nuovo service worker prende il controllo e la
pagina si ricarica. Il controllo avviene ogni 30 minuti e ogni volta che l'app
torna in primo piano. Chi la riapre da zero riceve già la versione nuova, perché
l'HTML è servito con strategia network-first.

La versione in esecuzione è mostrata in fondo alla pagina: comoda per capire
cosa sta effettivamente usando un utente che segnala un problema.
