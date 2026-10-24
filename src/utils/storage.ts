import rawProperties from '../data/properties.json';
import type { Property, LeadSubmission, ClickEvent, ClickStats, ClickSource } from '../types/property';

const PROPERTIES_STORAGE_KEY = 'domina_properties_v3';
const LEADS_STORAGE_KEY = 'domina_leads_v3';
const ADMIN_AUTH_KEY = 'domina_admin_authenticated';

export function getStoredProperties(): Property[] {
  try {
    const stored = localStorage.getItem(PROPERTIES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading properties from storage:', e);
  }
  return rawProperties as unknown as Property[];
}

export function saveStoredProperties(properties: Property[]): void {
  try {
    localStorage.setItem(PROPERTIES_STORAGE_KEY, JSON.stringify(properties));
  } catch (e) {
    console.error('Error saving properties to storage:', e);
  }
}

export function resetStoredProperties(): Property[] {
  try {
    localStorage.removeItem(PROPERTIES_STORAGE_KEY);
  } catch (e) {
    console.error('Error resetting properties:', e);
  }
  return rawProperties as unknown as Property[];
}

const CLICKS_STORAGE_KEY = 'domina_clicks_v3';

export function getStoredClicks(): ClickEvent[] {
  try {
    const stored = localStorage.getItem(CLICKS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading clicks:', e);
  }
  return [
    {
      id: 'click-1',
      source: 'analisi_urbanistica',
      sourceLabel: 'Vedi analisi urbanistica',
      propertyName: 'Ex negozio in via Roma',
      propertyAddress: 'Via Roma 42, Padova',
      timestamp: '24/10/2026, 11:18',
    },
    {
      id: 'click-2',
      source: 'dimmi_a_chi_proporla',
      sourceLabel: 'Dimmi a chi proporla',
      propertyName: 'Ex capannone industriale ZIP',
      propertyAddress: 'Corso Stati Uniti 18, Padova',
      timestamp: '24/10/2026, 11:45',
    },
  ];
}

export function recordClick(
  source: ClickSource,
  sourceLabel: string,
  propertyName?: string,
  propertyAddress?: string
): ClickEvent {
  const clicks = getStoredClicks();
  const newClick: ClickEvent = {
    id: `click-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    source,
    sourceLabel,
    propertyName,
    propertyAddress,
    timestamp: new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
  clicks.unshift(newClick);
  try {
    localStorage.setItem(CLICKS_STORAGE_KEY, JSON.stringify(clicks));
  } catch (e) {
    console.error('Error recording click:', e);
  }
  return newClick;
}

export function clearStoredClicks(): void {
  try {
    localStorage.removeItem(CLICKS_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing clicks:', e);
  }
}

export function getClickStats(): ClickStats {
  const clicks = getStoredClicks();
  const bySource: Record<ClickSource, number> = {
    analisi_urbanistica: 0,
    dimmi_a_chi_proporla: 0,
    trova_proprietario: 0,
    cluster_riservato: 0,
  };

  clicks.forEach((c) => {
    if (bySource[c.source] !== undefined) {
      bySource[c.source]++;
    }
  });

  return {
    totalClicks: clicks.length,
    bySource,
  };
}

export function getStoredLeads(): LeadSubmission[] {
  try {
    const stored = localStorage.getItem(LEADS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading leads:', e);
  }
  return [
    {
      id: 'lead-1',
      email: 'investimenti@fondoveneto.it',
      timestamp: '24/10/2026, 11:20',
      source: 'analisi_urbanistica',
      sourceLabel: 'Vedi analisi urbanistica',
      propertyName: 'Ex negozio in via Roma',
      city: 'Padova',
    },
  ];
}

export function saveLead(
  email: string,
  source: ClickSource | string = 'cluster_riservato',
  sourceLabel: string = 'Sblocco location',
  propertyName?: string,
  hiddenCount?: number,
  city: string = 'Padova'
): LeadSubmission {
  const leads = getStoredLeads();
  const newLead: LeadSubmission = {
    id: `lead-${Date.now()}`,
    email: email.trim(),
    timestamp: new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    source,
    sourceLabel,
    propertyName,
    hiddenCount,
    city,
  };
  leads.unshift(newLead);
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.error('Error saving lead:', e);
  }
  return newLead;
}

export function deleteStoredLead(id: string): LeadSubmission[] {
  const leads = getStoredLeads().filter((l) => l.id !== id);
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.error('Error deleting lead:', e);
  }
  return leads;
}

export function getStoredAdminAuth(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setStoredAdminAuth(isAuth: boolean): void {
  try {
    localStorage.setItem(ADMIN_AUTH_KEY, String(isAuth));
  } catch (e) {
    console.error('Error saving admin auth:', e);
  }
}

