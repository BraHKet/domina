import type { ClickEvent, LeadSubmission, Property } from '../types/property';

const GOOGLE_SHEET_URL_KEY = 'domina_google_sheet_webhook_url';

// Default: Webhook Google Apps Script preconfigurato per tutti gli utenti
export const DEFAULT_WEBHOOK_URL =
  import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbz-NkOYbParXYUHIxPe2z1W7gokJM9M1FXm1IxqbWmj5E7JsT6rs-gYbiT3jNtIQnzE/exec';

const PREVIOUS_LEGACY_URLS = [
  'https://script.google.com/macros/s/AKfycbyzKOHX2qh0AyBWfhF05KZFNyJFAZ7Ymyp61xKFaAvDDKjAUAJx_kfcoSf2zJCqpYtH/exec',
];

export function getGoogleSheetWebhookUrl(): string {
  try {
    const stored = localStorage.getItem(GOOGLE_SHEET_URL_KEY);
    // Se è memorizzato un vecchio URL legacy, aggiornalo con quello nuovo
    if (stored && PREVIOUS_LEGACY_URLS.includes(stored.trim())) {
      localStorage.setItem(GOOGLE_SHEET_URL_KEY, DEFAULT_WEBHOOK_URL);
      return DEFAULT_WEBHOOK_URL;
    }
    if (stored && stored.trim() !== '') {
      return stored.trim();
    }
  } catch {
    // Ignore error
  }
  return DEFAULT_WEBHOOK_URL;
}

export function setGoogleSheetWebhookUrl(url: string): void {
  try {
    localStorage.setItem(GOOGLE_SHEET_URL_KEY, url.trim());
  } catch (e) {
    console.error('Error saving Google Sheet webhook URL:', e);
  }
}

/**
 * Sends lead data to Google Sheets via Apps Script Webhook.
 * Uses mode: 'no-cors' so browser requests to Google Apps Script never get blocked by CORS.
 */
export async function syncLeadToGoogleSheet(lead: LeadSubmission): Promise<boolean> {
  const webhookUrl = getGoogleSheetWebhookUrl();
  if (!webhookUrl) {
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
    console.error('Errore durante l\'invio del lead a Google Sheets:', error);
    return false;
  }
}

/**
 * Sends click event to Google Sheets via Apps Script Webhook.
 */
export async function syncClickToGoogleSheet(click: ClickEvent): Promise<boolean> {
  const webhookUrl = getGoogleSheetWebhookUrl();
  if (!webhookUrl) {
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
    console.error('Errore durante l\'invio del clic a Google Sheets:', error);
    return false;
  }
}

/**
 * Salva o aggiorna un immobile/capannone su Google Sheets via Apps Script Webhook.
 * Invia l'oggetto Property e sincronizza in tempo reale con la scheda "Immobili".
 */
export async function syncPropertyToGoogleSheet(property: Property): Promise<boolean> {
  const webhookUrl = getGoogleSheetWebhookUrl();
  if (!webhookUrl) {
    console.warn('Google Sheet Webhook URL non configurata. Immobile salvato solo in locale.');
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
  const webhookUrl = getGoogleSheetWebhookUrl();
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
 * Sincronizzazione massiva di tutti gli immobili iniziali su Google Sheets.
 */
export async function syncAllPropertiesToGoogleSheet(properties: Property[]): Promise<boolean> {
  const webhookUrl = getGoogleSheetWebhookUrl();
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
 * Recupera l'elenco degli immobili/capannoni memorizzati nel database Google Sheets.
 */
export async function fetchRemoteProperties(): Promise<Property[] | null> {
  const webhookUrl = getGoogleSheetWebhookUrl();
  if (!webhookUrl) return null;

  try {
    const response = await fetch(`${webhookUrl}?action=get_properties`, {
      method: 'GET',
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (json && Array.isArray(json.properties) && json.properties.length > 0) {
      return json.properties as Property[];
    }
    return null;
  } catch (error) {
    console.warn('Impossibile scaricare gli immobili da Google Sheets:', error);
    return null;
  }
}

/**
 * Fetches all remote records from Google Sheet if the Apps Script doGet is enabled.
 */
export async function fetchRemoteGoogleSheetData(): Promise<{
  properties?: Property[];
  leads: LeadSubmission[];
  clicks: ClickEvent[];
} | null> {
  const webhookUrl = getGoogleSheetWebhookUrl();
  if (!webhookUrl) return null;

  try {
    const response = await fetch(`${webhookUrl}?action=get_all`, {
      method: 'GET',
    });
    if (!response.ok) return null;
    const json = await response.json();
    return json;
  } catch {
    // If doGet is not set up or CORS prevents GET, fallback gracefully
    return null;
  }
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
