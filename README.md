# 🌩️ Meteo Italia — PWA Previsioni & Allerte

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
- **Desktop**: Chrome/Edge → Menu ⋮ → "Installa MeteoIT"

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
