/**
 * Session tracking utilities for Domina Location Intelligence:
 * - Tempo sul sito prima dell'azione
 * - Dispositivo (Mobile / Desktop / OS)
 * - Provenienza (Referrer / Parametri UTM)
 * - Città di connessione (Geo-IP)
 */

const SESSION_START_TIME = Date.now();
let cachedGeoLocation: string = '';

// Inizializza il rilevamento della città di connessione in background
export async function initGeoLocation(): Promise<string> {
  if (cachedGeoLocation) return cachedGeoLocation;

  // Prova a leggere da sessionStorage se già recuperato
  try {
    const saved = sessionStorage.getItem('domina_user_geo');
    if (saved) {
      cachedGeoLocation = saved;
      return saved;
    }
  } catch {
    // Ignore error
  }

  // Chiamata asincrona a servizio Geo-IP gratuito e veloce
  try {
    // ipwho.is è veloce, gratuito e supporta CORS
    const res = await fetch('https://ipwho.is/', { cache: 'force-cache' });
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
    // Fallback secondario su ipapi.co
    try {
      const res2 = await fetch('https://ipapi.co/json/');
      if (res2.ok) {
        const data2 = await res2.json();
        const loc2 = [data2.city, data2.region, data2.country_name].filter(Boolean).join(', ');
        if (loc2) {
          cachedGeoLocation = loc2;
          return loc2;
        }
      }
    } catch {
      // Ignore error
    }
  }

  // Fallback basato sul fuso orario del browser se la chiamata di rete fallisce
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = tz.split('/');
    const zone = parts[parts.length - 1].replace(/_/g, ' ');
    cachedGeoLocation = `${zone} (Fuso orario)`;
    return cachedGeoLocation;
  } catch {
    cachedGeoLocation = 'Italia';
    return cachedGeoLocation;
  }
}

// Avvia immediatamente il recupero in background all'import
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
