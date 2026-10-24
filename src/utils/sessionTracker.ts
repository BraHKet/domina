/**
 * Session tracking utilities for Domina Location Intelligence:
 * - Tempo sul sito prima dell'azione
 * - Dispositivo (Mobile / Desktop / OS)
 * - Provenienza (Referrer / Parametri UTM)
 * - Città di connessione (Geo-IP)
 */

const SESSION_START_TIME = Date.now();

function getInitialCityFallback(): string {
  try {
    const saved = sessionStorage.getItem('domina_user_geo');
    if (saved && saved.trim() !== '') return saved;
  } catch {
    // Ignore error
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = tz.split('/');
    const zone = parts[parts.length - 1].replace(/_/g, ' ');
    return zone || 'Italia';
  } catch {
    return 'Italia';
  }
}

let cachedGeoLocation: string = getInitialCityFallback();

/**
 * Restituisce istantaneamente la città senza bloccare il flusso (usata per invii immediati).
 */
export function getFastUserCity(): string {
  return cachedGeoLocation || 'Italia';
}

// Inizializza il rilevamento della città di connessione in background con timeout rigoroso
export async function initGeoLocation(): Promise<string> {
  // Se già ottenuto da ipwhois, usalo
  if (cachedGeoLocation && !cachedGeoLocation.includes('Italia') && !cachedGeoLocation.includes('Rome')) {
    return cachedGeoLocation;
  }

  // Chiamata asincrona a servizio Geo-IP gratuito con timeout di 1.5 secondi
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch('https://ipwho.is/', {
      signal: controller.signal,
      cache: 'force-cache',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const city = data.city || '';
        const region = data.region || '';
        const country = data.country || '';
        const loc = [city, region, country].filter(Boolean).join(', ');
        if (loc) {
          cachedGeoLocation = loc;
          try {
            sessionStorage.setItem('domina_user_geo', loc);
          } catch {
            // Ignore error
          }
          return loc;
        }
      }
    }
  } catch {
    // Non bloccare mai se la rete è lenta o bloccata da adblocker
  }

  return cachedGeoLocation;
}

// Avvia immediatamente il recupero in background
initGeoLocation().catch(() => {});

/**
 * Calcola il tempo esatto trascorso dall'apertura della pagina
 */
export function getTimeOnSite(): string {
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - SESSION_START_TIME) / 1000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds} sec`;
  }
  const minutes = Math.floor(elapsedSeconds / 60);
  const remainingSeconds = elapsedSeconds % 60;
  return `${minutes} min ${remainingSeconds} sec`;
}

/**
 * Rileva il dispositivo (Mobile vs Desktop, Sistema Operativo, Risoluzione)
 */
export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Desktop';

  const ua = navigator.userAgent;
  let os = 'Sconosciuto';
  let deviceType = 'Desktop';

  // Rileva OS
  if (/iPhone/i.test(ua)) {
    os = 'iPhone (iOS)';
    deviceType = 'Mobile';
  } else if (/iPad/i.test(ua)) {
    os = 'iPad (iPadOS)';
    deviceType = 'Tablet';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    deviceType = /Mobile/i.test(ua) ? 'Mobile' : 'Tablet';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows PC';
    deviceType = 'Desktop';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'Mac (macOS)';
    deviceType = 'Desktop';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    deviceType = 'Desktop';
  }

  const screenRes = `${window.innerWidth}x${window.innerHeight}`;
  return `${os} • ${deviceType} (${screenRes})`;
}

/**
 * Rileva la provenienza dell'utente (Referrer o Parametri UTM di campagna)
 */
export function getTrafficSource(): string {
  if (typeof window === 'undefined') return 'Diretto';

  try {
    // 1. Controlla parametri UTM nell'URL
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmCampaign = params.get('utm_campaign');
    const utmMedium = params.get('utm_medium');

    if (utmSource) {
      let utmDesc = `Campagna: ${utmSource}`;
      if (utmMedium) utmDesc += ` (${utmMedium})`;
      if (utmCampaign) utmDesc += ` - ${utmCampaign}`;
      return utmDesc;
    }

    // 2. Controlla document.referrer
    const ref = document.referrer;
    if (ref) {
      const lower = ref.toLowerCase();
      if (lower.includes('linkedin.com')) return 'LinkedIn';
      if (lower.includes('whatsapp') || lower.includes('wa.me')) return 'WhatsApp';
      if (lower.includes('google.')) return 'Google Search';
      if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'Facebook';
      if (lower.includes('instagram.com')) return 'Instagram';
      if (lower.includes('t.co') || lower.includes('twitter.com') || lower.includes('x.com')) return 'X (Twitter)';
      
      try {
        const urlObj = new URL(ref);
        return `Sito: ${urlObj.hostname}`;
      } catch {
        return ref;
      }
    }
  } catch {
    // Ignore error
  }

  return 'Accesso Diretto (Link / Messaggio)';
}

/**
 * Restituisce i metadati completi al momento dell'evento
 */
export async function getSessionMetadata(): Promise<{
  userCity: string;
  device: string;
  referrer: string;
  timeOnSite: string;
}> {
  const userCity = cachedGeoLocation || (await initGeoLocation());
  const device = getDeviceInfo();
  const referrer = getTrafficSource();
  const timeOnSite = getTimeOnSite();

  return {
    userCity,
    device,
    referrer,
    timeOnSite,
  };
}
