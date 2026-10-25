import type { ClickEvent, LeadSubmission, Property, PropertyCategory, ActivityStatus } from '../types/property';

const STATS_SHEET_URL_KEY = 'domina_google_sheet_webhook_url';
const PROPERTIES_SHEET_URL_KEY = 'domina_properties_sheet_webhook_url';

// 1. Foglio Google per STATISTICHE (Click tracciati, visitatori e Lead acquisiti)
export const DEFAULT_STATS_WEBHOOK_URL =
  import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbyzKOHX2qh0AyBWfhF05KZFNyJFAZ7Ymyp61xKFaAvDDKjAUAJx_kfcoSf2zJCqpYtH/exec';

// 2. Foglio Google per IMMOBILI & CAPANNONI (Database delle schede immobiliari)
export const DEFAULT_PROPERTIES_WEBHOOK_URL =
  import.meta.env.VITE_PROPERTIES_SHEET_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbz-NkOYbParXYUHIxPe2z1W7gokJM9M1FXm1IxqbWmj5E7JsT6rs-gYbiT3jNtIQnzE/exec';

// Alias per retrocompatibilità
export const DEFAULT_WEBHOOK_URL = DEFAULT_STATS_WEBHOOK_URL;

export function getStatsWebhookUrl(): string {
  try {
    const stored = localStorage.getItem(STATS_SHEET_URL_KEY);
    if (stored && stored.trim() !== '') {
      // Se era stato memorizzato temporaneamente l'URL del foglio immobili, ripristina quello delle statistiche
      if (stored.trim() === DEFAULT_PROPERTIES_WEBHOOK_URL) {
        localStorage.setItem(STATS_SHEET_URL_KEY, DEFAULT_STATS_WEBHOOK_URL);
        return DEFAULT_STATS_WEBHOOK_URL;
      }
      return stored.trim();
    }
  } catch {
    // Ignore error
  }
  return DEFAULT_STATS_WEBHOOK_URL;
}

export function getPropertiesWebhookUrl(): string {
  try {
    const stored = localStorage.getItem(PROPERTIES_SHEET_URL_KEY);
    if (stored && stored.trim() !== '') {
      return stored.trim();
    }
  } catch {
    // Ignore error
  }
  return DEFAULT_PROPERTIES_WEBHOOK_URL;
}

export function getGoogleSheetWebhookUrl(): string {
  return getStatsWebhookUrl();
}

export function setGoogleSheetWebhookUrl(url: string): void {
  try {
    localStorage.setItem(STATS_SHEET_URL_KEY, url.trim());
  } catch (e) {
    console.error('Error saving Google Sheet webhook URL:', e);
  }
}

export function setPropertiesWebhookUrl(url: string): void {
  try {
    localStorage.setItem(PROPERTIES_SHEET_URL_KEY, url.trim());
  } catch (e) {
    console.error('Error saving Properties webhook URL:', e);
  }
}

/**
 * Sends lead data to Google Sheets via Apps Script Webhook.
 * Uses mode: 'no-cors' so browser requests to Google Apps Script never get blocked by CORS.
 * Invia al foglio delle statistiche e notifica anche il foglio immobili se separato.
 */
export async function syncLeadToGoogleSheet(lead: LeadSubmission): Promise<boolean> {
  const statsUrl = getStatsWebhookUrl();
  const propertiesUrl = getPropertiesWebhookUrl();

  if (!statsUrl && !propertiesUrl) {
    console.warn('Google Sheet Webhook URL non configurata. Dati salvati solo in locale.');
    return false;
  }

  const payload = {
    action: 'save_lead',
    type: 'LEAD (Email acquisita)',
    email: lead.email,
    source: lead.source,
    sourceLabel: lead.sourceLabel || lead.source,
    propertyName: lead.propertyName || (lead.hiddenCount ? `${lead.hiddenCount} immobili riservati` : 'Padova'),
    city: lead.city || 'Padova',
    timestamp: lead.timestamp,
    userCity: lead.userCity || 'Sconosciuta',
    device: lead.device || 'Desktop',
    referrer: lead.referrer || 'Accesso Diretto',
    timeOnSite: lead.timeOnSite || '0 sec',
  };

  let sent = false;

  // 1. Invia sempre al Foglio Statistiche originale
  if (statsUrl) {
    try {
      await fetch(statsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors',
        keepalive: true,
      });
      sent = true;
    } catch (error) {
      console.error('Errore durante l\'invio del lead al Foglio Statistiche:', error);
    }
  }

  // 2. Se l'URL del foglio immobili è separato, invia copia di sicurezza anche lì
  if (propertiesUrl && propertiesUrl !== statsUrl) {
    fetch(propertiesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      keepalive: true,
    }).catch(() => {});
  }

  return sent;
}

/**
 * Sends click event to Google Sheets via Apps Script Webhook.
 * Invia al Foglio Statistiche originale.
 */
export async function syncClickToGoogleSheet(click: ClickEvent): Promise<boolean> {
  const statsUrl = getStatsWebhookUrl();
  const propertiesUrl = getPropertiesWebhookUrl();

  if (!statsUrl && !propertiesUrl) {
    return false;
  }

  const payload = {
    action: 'track_click',
    type: 'CLIC (Pulsante)',
    email: '-',
    source: click.source,
    sourceLabel: click.sourceLabel,
    propertyName: click.propertyName || click.propertyAddress || 'Opportunità riservate',
    city: 'Padova',
    timestamp: click.timestamp,
    userCity: click.userCity || 'Sconosciuta',
    device: click.device || 'Desktop',
    referrer: click.referrer || 'Accesso Diretto',
    timeOnSite: click.timeOnSite || '0 sec',
  };

  let sent = false;

  // 1. Invia al Foglio Statistiche originale
  if (statsUrl) {
    try {
      await fetch(statsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors',
        keepalive: true,
      });
      sent = true;
    } catch (error) {
      console.error('Errore durante l\'invio del clic al Foglio Statistiche:', error);
    }
  }

  // 2. Se il foglio immobili è separato, invia anche lì in background
  if (propertiesUrl && propertiesUrl !== statsUrl) {
    fetch(propertiesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      keepalive: true,
    }).catch(() => {});
  }

  return sent;
}

/**
 * Salva o aggiorna un immobile/capannone su Google Sheets via Apps Script Webhook.
 * Invia l'oggetto Property e sincronizza in tempo reale con la scheda "Immobili" del Foglio Immobili.
 */
export async function syncPropertyToGoogleSheet(property: Property): Promise<boolean> {
  const webhookUrl = getPropertiesWebhookUrl();
  if (!webhookUrl) {
    console.warn('Google Sheet Webhook URL immobili non configurata. Immobile salvato solo in locale.');
    return false;
  }

  const payload = {
    action: 'save_property',
    property,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      keepalive: true,
    });
    return true;
  } catch (error) {
    console.error('Errore durante il salvataggio dell\'immobile su Google Sheets:', error);
    return false;
  }
}

/**
 * Elimina un immobile/capannone da Google Sheets tramite ID.
 */
export async function deletePropertyFromGoogleSheet(propertyId: string): Promise<boolean> {
  const webhookUrl = getPropertiesWebhookUrl();
  if (!webhookUrl) {
    return false;
  }

  const payload = {
    action: 'delete_property',
    id: propertyId,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      keepalive: true,
    });
    return true;
  } catch (error) {
    console.error('Errore durante l\'eliminazione dell\'immobile da Google Sheets:', error);
    return false;
  }
}

/**
 * Sincronizzazione massiva di tutti gli immobili su Google Sheets.
 */
export async function syncAllPropertiesToGoogleSheet(properties: Property[]): Promise<boolean> {
  const webhookUrl = getPropertiesWebhookUrl();
  if (!webhookUrl) return false;

  const payload = {
    action: 'save_all_properties',
    properties,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
      keepalive: true,
    });
    return true;
  } catch (error) {
    console.error('Errore durante la sincronizzazione massiva degli immobili su Google Sheets:', error);
    return false;
  }
}

/**
 * Normalizza un oggetto immobile ricevuto da Google Sheets
 */
export function normalizeProperty(p: any): Property {
  const categoryLabels: Record<PropertyCategory, string> = {
    negozi: 'Negozio / Locale commerciale',
    capannoni: 'Capannone industriale',
    altri: 'Altri immobili dismessi',
  };

  const cat: PropertyCategory =
    p.category === 'capannoni' || p.category === 'altri' ? p.category : 'negozi';

  const actStatus: ActivityStatus =
    p.activityStatus === 'attivo' || p.status === 'Attivo' ? 'attivo' : 'dismesso';

  const lat =
    Array.isArray(p.coordinates) && typeof p.coordinates[0] === 'number'
      ? p.coordinates[0]
      : parseFloat(p.coordinates?.[0]) || 45.4075;

  const lng =
    Array.isArray(p.coordinates) && typeof p.coordinates[1] === 'number'
      ? p.coordinates[1]
      : parseFloat(p.coordinates?.[1]) || 11.88;

  return {
    ...p,
    id: String(p.id || `domina-${Date.now()}`),
    name: String(p.name || 'Immobile Padova'),
    code: String(p.code || 'PD-LOC-000'),
    address: String(p.address || 'Padova (PD)'),
    district: String(p.district || 'Padova'),
    city: String(p.city || 'Padova'),
    category: cat,
    categoryLabel: p.categoryLabel || categoryLabels[cat],
    status: actStatus === 'attivo' ? 'Attivo' : 'Dismesso',
    activityStatus: actStatus,
    isVisibleToUser: p.isVisibleToUser !== false && String(p.isVisibleToUser).toUpperCase() !== 'NO',
    coordinates: [lat, lng],
    coveredAreaSqm:
      p.coveredAreaSqm !== null && p.coveredAreaSqm !== undefined && p.coveredAreaSqm !== ''
        ? Number(p.coveredAreaSqm)
        : null,
    lotAreaSqm:
      p.lotAreaSqm !== null && p.lotAreaSqm !== undefined && p.lotAreaSqm !== ''
        ? Number(p.lotAreaSqm)
        : null,
    image: String(p.image || '/images/immobile-001.jpg'),
    description: String(p.description || ''),
    opportunityNotes: String(p.opportunityNotes || 'Opportunità di valorizzazione ad elevato potenziale.'),
    surroundingContext: String(p.surroundingContext || p.context || ''),
    accessibilityNotes: String(p.accessibilityNotes || 'Facilmente accessibile.'),
    urbanPlanning: p.urbanPlanning || {
      patClassification: 'Ambiti Urbani Consolidati',
      piZoning: 'Zona di Completamento Urbanistico',
      allowedUses: ['Commerciale', 'Direzionale'],
      verifiedStatus: 'Verifica preliminare effettuata',
      heritageConstraints: 'Verifica vincoli locali.',
      bufferZones: 'Fascia di rispetto regolare.',
      environmentalNotes: 'Nessuna criticità ambientale.',
      criticalIssues: ['Verifica conformità impiantistica'],
      strengths: ['Ottima collocazione'],
      sources: 'Domina Intelligence SIT Padova',
      elaborationDate: 'Ottobre 2026',
    },
    pdfPath: p.pdfPath || '/dossiers/domina-dossier-immobile-001.pdf',
    pdfFileName: p.pdfFileName || 'domina-dossier-immobile-001.pdf',
    pdfSize: p.pdfSize || '1.8 MB',
    isDemonstrative: true,
  };
}

/**
 * Recupera l'elenco degli immobili/capannoni memorizzati nel database Google Sheets.
 * Interroga il database Immobili e, se vuoto/non disponibile, esegue il fallback sul database Statistiche.
 */
export async function fetchRemoteProperties(): Promise<Property[] | null> {
  const propertiesUrl = getPropertiesWebhookUrl();
  const statsUrl = getStatsWebhookUrl();

  const urlsToTry: string[] = [];
  if (propertiesUrl) urlsToTry.push(propertiesUrl);
  if (statsUrl && statsUrl !== propertiesUrl) urlsToTry.push(statsUrl);

  for (const url of urlsToTry) {
    try {
      let response = await fetch(`${url}?action=get_properties`, { method: 'GET' });
      if (!response.ok) {
        response = await fetch(`${url}?action=get_all`, { method: 'GET' });
      }
      if (!response.ok) continue;

      const json = await response.json();
      if (json && Array.isArray(json.properties) && json.properties.length > 0) {
        return json.properties.map(normalizeProperty);
      }
    } catch (error) {
      console.warn(`Tentativo recupero immobili da ${url} non riuscito:`, error);
    }
  }

  return null;
}

/**
 * Recupera tutti i record (Immobili, Lead e Clic) dai database Google Sheets.
 * Interroga entrambi i fogli (Statistiche e Immobili) e fonde le informazioni.
 */
export async function fetchRemoteGoogleSheetData(): Promise<{
  properties?: Property[];
  leads: LeadSubmission[];
  clicks: ClickEvent[];
} | null> {
  const statsUrl = getStatsWebhookUrl();
  const propertiesUrl = getPropertiesWebhookUrl();

  const urlsToTry: string[] = [];
  if (statsUrl) urlsToTry.push(statsUrl);
  if (propertiesUrl && propertiesUrl !== statsUrl) urlsToTry.push(propertiesUrl);

  if (urlsToTry.length === 0) return null;

  const mergedLeads: LeadSubmission[] = [];
  const mergedClicks: ClickEvent[] = [];
  let foundProperties: Property[] = [];
  let atLeastOneSuccess = false;

  for (const url of urlsToTry) {
    try {
      const response = await fetch(`${url}?action=get_all`, { method: 'GET' });
      if (!response.ok) continue;
      const json = await response.json();
      atLeastOneSuccess = true;

      // Unione Leads
      if (json && Array.isArray(json.leads) && json.leads.length > 0) {
        for (const lead of json.leads) {
          const exists = mergedLeads.some(
            (l) =>
              (l.id && l.id === lead.id) ||
              (l.email === lead.email && l.timestamp === lead.timestamp)
          );
          if (!exists && lead.email && lead.email !== '-') {
            mergedLeads.push(lead);
          }
        }
      }

      // Unione Clic
      if (json && Array.isArray(json.clicks) && json.clicks.length > 0) {
        for (const click of json.clicks) {
          const exists = mergedClicks.some(
            (c) =>
              (c.id && c.id === click.id) ||
              (c.timestamp === click.timestamp &&
                c.source === click.source &&
                c.propertyName === click.propertyName)
          );
          if (!exists) {
            mergedClicks.push(click);
          }
        }
      }

      // Immobili
      if (
        json &&
        Array.isArray(json.properties) &&
        json.properties.length > 0 &&
        foundProperties.length === 0
      ) {
        foundProperties = json.properties.map(normalizeProperty);
      }
    } catch (error) {
      console.warn(`Errore sincronizzazione dati da ${url}:`, error);
    }
  }

  if (!atLeastOneSuccess) return null;

  return {
    properties: foundProperties.length > 0 ? foundProperties : undefined,
    leads: mergedLeads,
    clicks: mergedClicks,
  };
}

export const APPS_SCRIPT_TEMPLATE = `// -------------------------------------------------------------
// DOMINA — Google Apps Script Database (Immobili + Leads + Clicks)
// -------------------------------------------------------------
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "";

    // 1. SALVATAGGIO / MODIFICA SINGOLO IMMOBILE / CAPANNONE
    if (action === "save_property") {
      var propSheet = getOrCreateSheet(ss, "Immobili", [
        "ID",
        "Codice",
        "Nome",
        "Indirizzo",
        "Categoria",
        "Stato Attività",
        "Visibile Utente",
        "Superficie Coperta (mq)",
        "Superficie Lotto (mq)",
        "Latitudine",
        "Longitudine",
        "URL Immagine",
        "Descrizione",
        "Data Ultima Modifica",
        "Dati Completi (JSON)"
      ]);

      var prop = data.property;
      var values = propSheet.getDataRange().getValues();
      var rowIndex = -1;

      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(prop.id)) {
          rowIndex = i + 1;
          break;
        }
      }

      var rowData = [
        prop.id,
        prop.code || "",
        prop.name || "",
        prop.address || "",
        prop.category || "capannoni",
        prop.activityStatus || (prop.status === "Attivo" ? "attivo" : "dismesso"),
        prop.isVisibleToUser !== false ? "SI" : "NO",
        prop.coveredAreaSqm !== null && prop.coveredAreaSqm !== undefined ? prop.coveredAreaSqm : "",
        prop.lotAreaSqm !== null && prop.lotAreaSqm !== undefined ? prop.lotAreaSqm : "",
        prop.coordinates ? prop.coordinates[0] : "",
        prop.coordinates ? prop.coordinates[1] : "",
        prop.image || "",
        prop.description || "",
        new Date().toLocaleString("it-IT"),
        JSON.stringify(prop)
      ];

      if (rowIndex > 0) {
        propSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        propSheet.appendRow(rowData);
      }

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", action: "saved", id: prop.id }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. ELIMINAZIONE IMMOBILE
    if (action === "delete_property") {
      var propSheet = ss.getSheetByName("Immobili");
      if (propSheet) {
        var values = propSheet.getDataRange().getValues();
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][0]) === String(data.id)) {
            propSheet.deleteRow(i + 1);
            break;
          }
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", action: "deleted" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. SALVATAGGIO MASSIVO IMMOBILI
    if (action === "save_all_properties" && Array.isArray(data.properties)) {
      var propSheet = getOrCreateSheet(ss, "Immobili", [
        "ID",
        "Codice",
        "Nome",
        "Indirizzo",
        "Categoria",
        "Stato Attività",
        "Visibile Utente",
        "Superficie Coperta (mq)",
        "Superficie Lotto (mq)",
        "Latitudine",
        "Longitudine",
        "URL Immagine",
        "Descrizione",
        "Data Ultima Modifica",
        "Dati Completi (JSON)"
      ]);

      for (var k = 0; k < data.properties.length; k++) {
        var prop = data.properties[k];
        var values = propSheet.getDataRange().getValues();
        var rowIndex = -1;
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][0]) === String(prop.id)) {
            rowIndex = i + 1;
            break;
          }
        }
        var rowData = [
          prop.id,
          prop.code || "",
          prop.name || "",
          prop.address || "",
          prop.category || "capannoni",
          prop.activityStatus || (prop.status === "Attivo" ? "attivo" : "dismesso"),
          prop.isVisibleToUser !== false ? "SI" : "NO",
          prop.coveredAreaSqm !== null && prop.coveredAreaSqm !== undefined ? prop.coveredAreaSqm : "",
          prop.lotAreaSqm !== null && prop.lotAreaSqm !== undefined ? prop.lotAreaSqm : "",
          prop.coordinates ? prop.coordinates[0] : "",
          prop.coordinates ? prop.coordinates[1] : "",
          prop.image || "",
          prop.description || "",
          new Date().toLocaleString("it-IT"),
          JSON.stringify(prop)
        ];
        if (rowIndex > 0) {
          propSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        } else {
          propSheet.appendRow(rowData);
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", count: data.properties.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. TRACCIAMENTO LEADS & CLICKS (salvato su foglio "Leads_Clicks")
    var leadSheet = getOrCreateSheet(ss, "Leads_Clicks", [
      "Data e Ora",
      "Tipo Evento",
      "Email Utente",
      "Pulsante Cliccato",
      "Immobile / Contesto",
      "Città Immobile",
      "Città Utente (Geo-IP)",
      "Dispositivo",
      "Provenienza (Traffic Source)",
      "Tempo sul Sito prima del Clic"
    ]);

    leadSheet.appendRow([
      data.timestamp || new Date().toLocaleString("it-IT"),
      data.type || "EVENTO",
      data.email || "-",
      data.sourceLabel || data.source || "-",
      data.propertyName || "-",
      data.city || "Padova",
      data.userCity || "Sconosciuta",
      data.device || "Desktop",
      data.referrer || "Accesso Diretto",
      data.timeOnSite || "0 sec"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "get_all";

    // 1. Immobili
    var properties = [];
    var propSheet = ss.getSheetByName("Immobili");
    if (propSheet && propSheet.getLastRow() > 1) {
      var pValues = propSheet.getDataRange().getValues();
      for (var p = 1; p < pValues.length; p++) {
        var pRow = pValues[p];
        if (!pRow[0]) continue;

        var propObj = null;
        if (pRow[14]) {
          try {
            propObj = JSON.parse(pRow[14]);
          } catch (err) {}
        }

        if (!propObj) {
          propObj = {
            id: String(pRow[0]),
            code: String(pRow[1]),
            name: String(pRow[2]),
            address: String(pRow[3]),
            category: String(pRow[4]),
            categoryLabel: String(pRow[4]) === "capannoni" ? "Capannone industriale" : String(pRow[4]) === "negozi" ? "Negozio / Locale commerciale" : "Altri immobili dismessi",
            activityStatus: String(pRow[5]),
            status: String(pRow[5]) === "attivo" ? "Attivo" : "Dismesso",
            isVisibleToUser: String(pRow[6]) !== "NO",
            coveredAreaSqm: pRow[7] !== "" ? Number(pRow[7]) : null,
            lotAreaSqm: pRow[8] !== "" ? Number(pRow[8]) : null,
            coordinates: [Number(pRow[9]) || 45.4075, Number(pRow[10]) || 11.8800],
            image: String(pRow[11]),
            description: String(pRow[12]),
            district: "Padova",
            city: "Padova",
            isDemonstrative: true
          };
        }
        properties.push(propObj);
      }
    }

    if (action === "get_properties") {
      return ContentService
        .createTextOutput(JSON.stringify({ properties: properties }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Leads e Clicks
    var leads = [];
    var clicks = [];
    var leadSheet = ss.getSheetByName("Leads_Clicks") || ss.getActiveSheet();
    if (leadSheet && leadSheet.getLastRow() > 1) {
      var values = leadSheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        var row = values[i];
        var isLead = String(row[1]).indexOf("LEAD") !== -1 || (row[2] && row[2] !== "-");
        var item = {
          id: "gs-" + i,
          timestamp: String(row[0]),
          email: String(row[2]),
          sourceLabel: String(row[3]),
          source: String(row[3]),
          propertyName: String(row[4]),
          city: String(row[5])
        };
        if (isLead && item.email && item.email !== "-") {
          leads.unshift(item);
        } else {
          clicks.unshift(item);
        }
      }
    }

    if (action === "get_leads") {
      return ContentService
        .createTextOutput(JSON.stringify({ leads: leads, clicks: clicks }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ properties: properties, leads: leads, clicks: clicks }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    var sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0) {
      sheet = sheets[0];
      sheet.setName(name);
    } else {
      sheet = ss.insertSheet(name);
    }
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setBackground("#0d6e5a");
    hRange.setFontColor("#ffffff");
    hRange.setFontWeight("bold");
  }
  return sheet;
}
`;
