
import webpush from "web-push";

const API = "https://allertameteo.regione.emilia-romagna.it/o/get-stato-allerta";
const RISKS = {
  idraulica:"criticità idraulica", idrogeologica:"criticità idrogeologica",
  temporali:"temporali", vento:"vento", temperature_estreme:"temperature estreme",
  neve:"neve", ghiaccio_pioggia_gela:"pioggia che gela",
  stato_mare:"stato del mare", mareggiate:"criticità costiera"
};
const ZONES = {
  A1:"Montagna romagnola", A2:"Alta collina romagnola",
  B1:"Bassa collina e pianura romagnola", B2:"Costa romagnola",
  C1:"Montagna bolognese", C2:"Collina bolognese",
  D1:"Pianura bolognese", D2:"Costa ferrarese", D3:"Pianura ferrarese",
  E1:"Montagna emiliana centrale", E2:"Collina emiliana centrale",
  F1:"Pianura modenese", F2:"Pianura reggiana", F3:"Pianura reggiana di Po",
  G1:"Montagna piacentino-parmense", G2:"Alta collina piacentino-parmense",
  H1:"Bassa collina piacentino-parmense", H2:"Pianura piacentino-parmense"
};
const IT = {green:"VERDE",yellow:"GIALLA",orange:"ARANCIONE",red:"ROSSA"};
const ORDER = ["green","yellow","orange","red"];

/* Lo stato di allerta e' un dato pubblico della Regione: lo esponiamo in
   sola lettura anche ad altre origini, cosi' altre app (es. IncheSenso)
   possono agganciarlo senza duplicare il proxy. Restano privati gli
   endpoint che toccano il database delle iscrizioni. */
const CORS_LETTURA = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-max-age": "86400"
};

export default {
  async fetch(request,env){
    const url = new URL(request.url);

    // preflight per gli endpoint pubblici in lettura
    if(request.method === "OPTIONS" &&
       (url.pathname === "/api/allerta" || url.pathname === "/api/location-zone")){
      return new Response(null,{status:204,headers:CORS_LETTURA});
    }

    if(url.pathname === "/api/allerta"){
      const response = await fetch(API,{cf:{cacheTtl:120,cacheEverything:true}});
      return new Response(await response.text(),{
        status:response.status,
        headers:{...CORS_LETTURA,"content-type":"application/json; charset=utf-8"}
      });
    }

    if(url.pathname === "/api/location-zone" && request.method === "GET"){
      return resolveLocationZone(url);
    }

    if(url.pathname === "/api/vapid-public-key"){
      return json({publicKey:env.VAPID_PUBLIC_KEY});
    }

    if(url.pathname === "/api/subscribe" && request.method === "POST"){
      const body = await request.json();
      const sub = body.subscription;
      if(!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth){
        return json({error:"Iscrizione non valida"},400);
      }
      await env.DB.prepare(`
        INSERT INTO subscriptions(endpoint,p256dh,auth,zone)
        VALUES(?,?,?,?)
        ON CONFLICT(endpoint) DO UPDATE SET
          p256dh=excluded.p256dh, auth=excluded.auth, zone=excluded.zone
      `).bind(sub.endpoint,sub.keys.p256dh,sub.keys.auth,body.zone).run();
      return json({ok:true});
    }

    if(url.pathname === "/api/unsubscribe" && request.method === "POST"){
      const body = await request.json();
      await env.DB.prepare("DELETE FROM subscriptions WHERE endpoint=?").bind(body.endpoint).run();
      return json({ok:true});
    }

    if(url.pathname === "/api/test-notification" && request.method === "POST"){
      const body = await request.json();
      const subscriber = await env.DB.prepare("SELECT * FROM subscriptions WHERE endpoint=?")
        .bind(body.endpoint).first();
      if(!subscriber) return json({error:"Iscrizione non trovata"},404);
      await sendPush(subscriber,{
        title:"Allerta Certo · Prova",
        body:`Notifiche attive per ${subscriber.zone} · ${ZONES[subscriber.zone] || "zona selezionata"}.`,
        url:`./?zona=${subscriber.zone}`,
        tag:`prova-${subscriber.zone}`
      },env);
      return json({ok:true});
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller,env,ctx){
    ctx.waitUntil(checkOfficialAlerts(env));
  }
};

function normalizeLevel(value){
  const level = String(value || "").toLowerCase();
  return ORDER.includes(level) ? level : null;
}

function buildSnapshot(data,zone){
  const zoneData = data?.[zone] || {};
  const risks = [];
  for(const [key,label] of Object.entries(RISKS)){
    const level = normalizeLevel(zoneData[key]);
    if(level && level !== "green") risks.push({key,label,level});
  }
  const max = [...ORDER].reverse().find(level => risks.some(r => r.level === level)) || "green";
  return {zone,max,risks,validUntil:data?.dataFine || ""};
}

function fingerprint(snapshot){
  return JSON.stringify({
    max:snapshot.max,
    risks:snapshot.risks.map(r => ({key:r.key,level:r.level})).sort((a,b) => a.key.localeCompare(b.key))
  });
}

function formatValidity(value){
  if(!value) return "";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT",{
    day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",timeZone:"Europe/Rome"
  }).format(date);
}

function buildNotification(snapshot){
  const zoneName = ZONES[snapshot.zone] || "Zona selezionata";
  if(snapshot.max === "green"){
    return {
      title:"Allerta Certo · Aggiornamento",
      body:`${snapshot.zone} · ${zoneName}: livello VERDE.`,
      url:`./?zona=${snapshot.zone}`,
      tag:`allerta-${snapshot.zone}`
    };
  }
  const details = snapshot.risks.map(r => `${r.label} ${IT[r.level].toLowerCase()}`).join(", ");
  const until = formatValidity(snapshot.validUntil);
  return {
    title:`Allerta ${IT[snapshot.max]}`,
    body:`${snapshot.zone} · ${zoneName}: ${details}.${until ? " Valida fino al " + until + "." : ""}`,
    url:`./?zona=${snapshot.zone}`,
    tag:`allerta-${snapshot.zone}`
  };
}

async function checkOfficialAlerts(env){
  const response = await fetch(API,{headers:{"User-Agent":"AllertaCerto/4.0"}});
  if(!response.ok) throw new Error(`Fonte ufficiale HTTP ${response.status}`);
  const data = await response.json();
  const zones = (await env.DB.prepare("SELECT DISTINCT zone FROM subscriptions").all()).results || [];

  for(const {zone} of zones){
    const snapshot = buildSnapshot(data,zone);
    const current = fingerprint(snapshot);
    const key = `state:v3:${zone}`;
    const previous = await env.DB.prepare("SELECT value FROM state WHERE key=?").bind(key).first();

    if(!previous){
      await env.DB.prepare("INSERT INTO state(key,value) VALUES(?,?)").bind(key,current).run();
      continue;
    }
    if(previous.value === current) continue;

    await env.DB.prepare("UPDATE state SET value=? WHERE key=?").bind(current,key).run();
    const subscribers = (await env.DB.prepare("SELECT * FROM subscriptions WHERE zone=?").bind(zone).all()).results || [];
    const notification = buildNotification(snapshot);

    for(const subscriber of subscribers){
      try{
        await sendPush(subscriber,notification,env);
      }catch(error){
        if(error?.statusCode === 404 || error?.statusCode === 410){
          await env.DB.prepare("DELETE FROM subscriptions WHERE endpoint=?").bind(subscriber.endpoint).run();
        }else{
          console.error("Invio push fallito",zone,error);
        }
      }
    }
  }
}

async function resolveLocationZone(url){
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if(!Number.isFinite(lat) || !Number.isFinite(lon)) return json({error:"Coordinate non valide"},400);
  if(lat < 43.65 || lat > 45.20 || lon < 9.15 || lon > 12.85){
    return json({error:"Posizione fuori dall’Emilia-Romagna"},404);
  }

  const reverseUrl = "https://nominatim.openstreetmap.org/reverse" +
    `?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;

  const reverseResponse = await fetch(reverseUrl,{
    headers:{
      "User-Agent":"AllertaCerto/4.0 (info@alessandropezzali.it)",
      "Accept-Language":"it"
    }
  });
  if(!reverseResponse.ok) return json({error:"Servizio di localizzazione non disponibile"},502);

  const reverse = await reverseResponse.json();
  const address = reverse.address || {};
  const comune = address.city || address.town || address.village || address.municipality;
  if(!comune) return json({error:"Comune non individuato"},404);

  const slug = comune.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/['’]/g,"-").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

  const officialResponse = await fetch(`https://allertameteo.regione.emilia-romagna.it/web/${slug}`,{
    headers:{"User-Agent":"AllertaCerto/4.0"}
  });
  if(!officialResponse.ok){
    return json({error:`Comune individuato (${comune}), ma zona ufficiale non trovata`},404);
  }

  const html = await officialResponse.text();
  const match = html.match(/Area di allertamento\s*([A-H][1-3])/i);
  if(!match){
    return json({error:`Comune individuato (${comune}), ma zona ufficiale non trovata`},404);
  }

  return json({comune,zone:match[1].toUpperCase()});
}

async function sendPush(subscriber,payload,env){
  webpush.setVapidDetails(env.VAPID_SUBJECT,env.VAPID_PUBLIC_KEY,env.VAPID_PRIVATE_KEY);
  return webpush.sendNotification({
    endpoint:subscriber.endpoint,
    keys:{p256dh:subscriber.p256dh,auth:subscriber.auth}
  },JSON.stringify(payload),{TTL:3600,urgency:"high"});
}

function json(value,status=200){
  return new Response(JSON.stringify(value),{
    status,
    headers:{"content-type":"application/json; charset=utf-8"}
  });
}
