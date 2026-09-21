# 🌩️ IncheSenso Meteo — PWA Previsioni & Allerte

Una Progressive Web App gratuita e open source per il monitoraggio meteo, radar temporali e allerte Protezione Civile in **tutti i 7.904 comuni italiani**, in base alla posizione rilevata. Nessuna API key, nessun account, nessuna pubblicità.

![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-Ready-blue)

## ✨ Funzionalità

- **🌤️ Previsioni meteo** — Correnti, orarie 24h e giornaliere 7 giorni (Open-Meteo, con MET Norway come fonte di riserva automatica)
- **🌐 Radar temporali** — Mappa animata con sovrapposizione radar RainViewer, legenda Debole/Moderato/Forte
- **🚨 Allerte per comune** — Bollettino di criticità DPC per oggi e domani, con dettaglio rischio temporali/idraulico/idrogeologico; per l'Emilia-Romagna anche le allerte regionali
- **🌡️ Ondate di calore** — Bollettino del Ministero della Salute per le 27 città monitorate
- **🧊 Rischio grandine** — Stima (non ufficiale) basata su allerta temporali DPC + codici meteo WMO 96/99
- **🔔 Notifiche** — Avvisi del browser quando cambia il livello di allerta
- **📍 Geolocalizzazione** — All'avvio rileva la posizione, risale al comune e carica le allerte di quel comune
- **🔎 Ricerca nazionale** — Cerca qualsiasi comune italiano per nome
- **📲 Installabile** — Funziona come app nativa su Android, iOS e desktop
- **🌐 Offline** — Service worker con caching; se le previsioni non arrivano mostra gli ultimi dati ricevuti (max 6 ore) con l'orario ben visibile

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
├── index.html          # App principale (HTML, CSS e JS in un unico file)
├── manifest.json       # Configurazione PWA
├── sw.js               # Service Worker (cache, offline, aggiornamenti)
├── worker.js           # Cloudflare Worker: allerte Emilia-Romagna e notifiche push
├── og-image.png        # Anteprima per la condivisione sui social
├── icons/
│   ├── icon-*.svg      # Icone responsive SVG
│   └── *.png           # Icone PNG, maskable e apple-touch-icon
└── README.md           # Questo file
```

## 🔌 API utilizzate

| Servizio | Dato | Costo |
|----------|------|-------|
| [Open-Meteo](https://open-meteo.com) | Previsioni meteo (fonte principale) | Gratuito, no key |
| [MET Norway](https://api.met.no) | Previsioni meteo (fonte di riserva) | Gratuito, no key |
| [RainViewer](https://www.rainviewer.com/api.html) | Tiles radar | Gratuito, no key |
| [Bollettini DPC](https://github.com/pcm-dpc/DPC-Bollettini-Criticita-Idrogeologica-Idraulica) via [OpenDataSicilia](https://github.com/opendatasicilia/DPC-bollettini-criticita-idrogeologica-idraulica) | Allerte per comune (tutta Italia) | Gratuito, no key |
| [Allerta Meteo Emilia-Romagna](https://allertameteo.regione.emilia-romagna.it/) | Allerte regionali (tramite `worker.js`) | Gratuito, no key |
| [Ondate di calore](https://www.salute.gov.it/new/it/tema/ondate-di-calore/) via [onData](https://github.com/ondata/ondate-calore) | Bollettino caldo, 27 città | Gratuito, no key |
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | Ricerca comune per nome | Gratuito, no key |
| [Nominatim](https://nominatim.openstreetmap.org) | Posizione GPS → comune | Gratuito, [usage policy](https://operations.osmfoundation.org/policies/nominatim/) |
| [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api) | Posizione GPS → comune (riserva) | Gratuito, no key |

Nessun servizio richiede account, chiavi o metodi di pagamento: **non esiste alcun modo
in cui l'app possa generare addebiti**. Se un limite d'uso viene superato, il servizio
smette semplicemente di rispondere finché il contatore non si azzera.

## 🌤️ Previsioni: fonte principale, riserva e limiti

Le previsioni arrivano da **Open-Meteo**. Il piano gratuito (uso non commerciale) prevede
al massimo **600 richieste al minuto, 5.000 all'ora e 10.000 al giorno**. I limiti si
contano **per indirizzo IP**, non per app: ogni utente chiama Open-Meteo dal proprio
browser e ha la sua quota. Lasciata aperta tutto il giorno, l'app ne usa circa 150
(un aggiornamento ogni 10 minuti). Il limite si raggiunge solo quando molti dispositivi
escono su internet dallo stesso indirizzo: reti aziendali, Wi-Fi pubblici, VPN, alcuni
operatori mobili.

Se Open-Meteo non risponde, l'app segue questa sequenza:

1. **Nuovo tentativo** dopo 1,5 secondi (solo per errori di rete o timeout di 12 s).
   Se la risposta è `429` (limite superato) non riprova e, per 15 minuti, salta
   direttamente al punto 2 per non consumare altre richieste.
2. **Fonte di riserva MET Norway** (Locationforecast 2.0, istituto meteorologico
   norvegese, servizio pubblico senza piani a pagamento). I dati vengono convertiti nel
   formato Open-Meteo, quindi schede, previsioni orarie, 7 giorni e stima grandine
   funzionano senza modifiche. Sotto il meteo attuale compare una nota con la fonte.
   I termini di MET Norway ammettono chiamate dirette dal browser per siti a basso
   traffico (il browser si identifica con l'header `Origin`); usata solo come riserva,
   l'app resta ampiamente in quel perimetro. Se un giorno diventasse la fonte
   principale con molto traffico, andrebbe servita tramite un proxy con cache
   (per esempio una rotta in `worker.js`).
3. **Ultimi dati salvati** in locale, se hanno meno di 6 ore e riguardano la stessa
   località, con l'orario ben visibile.
4. **Finestra in sovraimpressione** quando entrambe le fonti non rispondono: spiega il
   motivo (limite d'uso o servizio non raggiungibile), ricorda che l'app è gratuita e
   senza pubblicità e offre il tasto **🔄 Riprova ora**. Se l'utente la chiude non
   ricompare a ogni aggiornamento automatico; resta il tasto "Perché?" nella scheda meteo.

Con la fonte di riserva attiva si perdono alcuni dettagli: la probabilità di pioggia in
percentuale (restano i millimetri), la distinzione del temporale con grandine (MET
indica il temporale, non la grandine) e la temperatura percepita, che viene calcolata
dall'app con la formula di Steadman.

## 🚦 Semaforo temporali

Il semaforo mostra il **livello di allerta temporali del bollettino DPC** per la zona del
comune selezionato. Un'allerta per rischio idraulico o idrogeologico viene indicata nel
testo, ma non accende il semaforo: non va spacciata per un'allerta temporali.

| Colore | Significato |
|--------|-------------|
| 🔵 Azzurro | Nessuna allerta temporali (verde) |
| 🟡 Giallo | Allerta temporali gialla (criticità ordinaria) |
| 🔴 Rosso | Allerta temporali arancione o rossa |

La grandine ha una scheda a parte (**Rischio grandine**), perché non è un rischio del
bollettino DPC: è una stima ricavata dall'allerta temporali e dai codici WMO 96/99
delle previsioni orarie.

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
(Open-Meteo e MET Norway richiedono l'attribuzione CC BY 4.0). Nota che:

- **Open-Meteo** e **RainViewer** sono gratuiti per uso **non commerciale**
  (siti o app privati/no-profit, senza abbonamenti né pubblicità).
- **MET Norway** è un servizio pubblico gratuito; per volumi elevati chiede di passare
  da un proxy con cache invece di chiamare l'API da ogni browser.
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

L'app si aggiorna da sola. Il flusso è questo:

1. Modifica i file (`index.html`, `sw.js`, ...).
2. **Incrementa `CACHE_NAME` in `sw.js`** (es. da `meteo-it-v28` a `meteo-it-v29`).
   È l'unico passaggio obbligatorio: il browser rileva un aggiornamento solo se
   il file `sw.js` cambia nei byte.
3. Fai il commit e il push.

Appena il nuovo service worker è installato si attiva da solo e la pagina si ricarica
una volta, senza che l'utente debba fare nulla. Se entro 5 secondi l'attivazione non
avviene (worker che non risponde), compare come piano B la barra **"È disponibile una
nuova versione — Aggiorna"**. Chi riapre l'app da zero riceve già la versione nuova,
perché l'HTML è servito con strategia network-first.

La versione in esecuzione è mostrata in fondo alla pagina: comoda per capire
cosa sta effettivamente usando un utente che segnala un problema.

## 📋 Novità della versione v28

- **Fonte di riserva MET Norway** per le previsioni, attivata in automatico quando
  Open-Meteo non risponde.
- **Gestione degli errori** delle previsioni: timeout, controllo della risposta,
  pausa di 15 minuti su Open-Meteo dopo un `429`.
- **Ultimi dati salvati** mostrati con l'orario quando nessuna fonte risponde.
- **Finestra "Previsioni in pausa"** con spiegazione dei limiti gratuiti e tasto Riprova.
- **Rischio grandine** onesto: senza previsioni mostra "Dati incompleti" invece di
  "Rischio basso".
