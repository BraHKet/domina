import type { ClickEvent, LeadSubmission } from '../types/property';

const GOOGLE_SHEET_URL_KEY = 'domina_google_sheet_webhook_url';

// Default fallback: Lorenzo's Google Sheet Webhook for all users worldwide
const DEFAULT_WEBHOOK_URL =
  import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbyzKOHX2qh0AyBWfhF05KZFNyJFAZ7Ymyp61xKFaAvDDKjAUAJx_kfcoSf2zJCqpYtH/exec';

export function getGoogleSheetWebhookUrl(): string {
  try {
    const stored = localStorage.getItem(GOOGLE_SHEET_URL_KEY);
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
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
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
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });
    return true;
  } catch (error) {
    console.error('Errore durante l\'invio del clic a Google Sheets:', error);
    return false;
  }
}

/**
 * Fetches all remote records from Google Sheet if the Apps Script doGet is enabled.
 */
export async function fetchRemoteGoogleSheetData(): Promise<{ leads: LeadSubmission[]; clicks: ClickEvent[] } | null> {
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
// DOMINA — Google Apps Script per raccolta Clic & Lead in tempo reale
// -------------------------------------------------------------
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Crea intestazioni se il foglio è vuoto
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Data e Ora",
        "Tipo Evento",
        "Email Utente",
        "Pulsante Cliccato",
        "Immobile / Contesto",
        "Città"
      ]);
      // Stile intestazioni
      var headerRange = sheet.getRange(1, 1, 1, 6);
      headerRange.setBackground("#0d6e5a");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
    }

    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.timestamp || new Date().toLocaleString("it-IT"),
      data.type || "EVENTO",
      data.email || "-",
      data.sourceLabel || data.source || "-",
      data.propertyName || "-",
      data.city || "Padova"
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
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ leads: [], clicks: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var leads = [];
    var clicks = [];
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
    return ContentService
      .createTextOutput(JSON.stringify({ leads: leads, clicks: clicks }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
