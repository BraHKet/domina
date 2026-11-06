import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { CadastralParcel, Property } from '../types/property';
import { calculateUrbanParameters } from '../utils/urbanCalculationEngine';
import { formatNumber, getLotData } from '../utils/urbanLot';
import { CATASTO_ATTRIBUTION, CATASTO_WMS_URL } from '../utils/cadastre';

/** Scelta delle particelle in Admin: la mappa mostra il catasto e passa i clic. */
export interface ParcelPickingState {
  center: [number, number];
  selected: CadastralParcel[];
  onPick: (lat: number, lng: number) => void;
}

interface MapViewProps {
  properties: Property[];
  selectedProperty: Property | null;
  isAdmin: boolean;
  onSelectProperty: (property: Property) => void;
  onOpenUnlockModal: (count: number) => void;
  onMapClickAddLocation?: (lat: number, lng: number) => void;
  parcelPicking?: ParcelPickingState | null;
}

// Il catasto non offre la proiezione della mappa web: si chiedono le immagini in gradi
const CATASTO_CRS = L.Util.extend({}, L.CRS.EPSG4326, { code: 'EPSG:4258' }) as L.CRS;
const LOT_OUTLINE_STYLE: L.PathOptions = {
  color: '#fbbf24',
  weight: 3,
  fillColor: '#fbbf24',
  fillOpacity: 0.12,
  interactive: false,
};
const PICKED_PARCEL_STYLE: L.PathOptions = {
  color: '#f59e0b',
  weight: 2,
  fillColor: '#f59e0b',
  fillOpacity: 0.4,
  interactive: false,
};

const PADOVA_CENTER: [number, number] = [45.4075, 11.879];
const INITIAL_ZOOM = 13;
const FOCUS_ZOOM = 18;
const HOVER_CARD_HEIGHT = 240;
const ESRI_SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community';

export const MapView: React.FC<MapViewProps> = ({
  properties,
  selectedProperty,
  isAdmin,
  onSelectProperty,
  onOpenUnlockModal,
  onMapClickAddLocation,
  parcelPicking = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const reservedMarkerRef = useRef<L.Marker | null>(null);
  const previousViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const pickHandlerRef = useRef<ParcelPickingState['onPick'] | null>(null);
  const isPicking = parcelPicking !== null;
  const onPick = parcelPicking?.onPick ?? null;
  useEffect(() => {
    pickHandlerRef.current = onPick;
  }, [onPick]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: PADOVA_CENTER,
      zoom: INITIAL_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    // Zoom controls at bottom-left
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Sfondo satellitare Esri, senza chiave. VITE_MAP_TILE_URL permette di sostituirlo.
    const customTileUrl = import.meta.env.VITE_MAP_TILE_URL;

    L.tileLayer(customTileUrl || ESRI_SATELLITE_URL, {
      maxNativeZoom: 19,
      maxZoom: 20,
      attribution: customTileUrl ? '' : ESRI_ATTRIBUTION,
    }).addTo(map);

    // Admin map click to add location
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickHandlerRef.current) {
        pickHandlerRef.current(e.latlng.lat, e.latlng.lng);
        return;
      }
      if (isAdmin && onMapClickAddLocation) {
        onMapClickAddLocation(e.latlng.lat, e.latlng.lng);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers based on properties and Admin / User mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};
    reservedMarkerRef.current?.remove();
    reservedMarkerRef.current = null;

    // Mentre si scelgono le particelle i pin coprirebbero proprio gli edifici da cliccare
    if (isPicking) return;

    // Segregate visible vs hidden properties
    const visibleProperties = isAdmin
      ? properties
      : properties.filter((p) => p.isVisibleToUser !== false);

    // 1. Render standard pins
    visibleProperties.forEach((prop) => {
      const isSelected = selectedProperty?.id === prop.id;
      const isHidden = prop.isVisibleToUser === false;
      const icon = createTeardropMarkerIcon(prop, isSelected, isAdmin && isHidden);

      const marker = L.marker(prop.coordinates, {
        icon: icon,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.on('click', () => {
        onSelectProperty(prop);
      });

      if (!isSelected) {
        // Va registrato prima del tooltip: decide il lato giusto prima che si apra
        marker.on('mouseover', () => {
          const tooltip = marker.getTooltip();
          if (!tooltip) return;
          const roomAbove = map.latLngToContainerPoint(marker.getLatLng()).y > HOVER_CARD_HEIGHT;
          tooltip.options.direction = roomAbove ? 'top' : 'bottom';
          tooltip.options.offset = roomAbove ? [0, -50] : [0, 4];
        });
        marker.bindTooltip(() => createHoverCard(prop), {
          className: 'domina-hover-card',
          opacity: 1,
        });
      }

      marker.addTo(map);
      marker.getElement()?.setAttribute('aria-label', prop.name);
      markersRef.current[prop.id] = marker;
    });

    // 2. I riservati stanno sempre in centro città: la posizione non dipende dagli immobili
    const reservedCount = properties.filter((p) => p.isVisibleToUser === false).length;
    if (!isAdmin && reservedCount > 0) {
      const reservedMarker = L.marker(PADOVA_CENTER, {
        icon: createReservedIcon(reservedCount),
        zIndexOffset: 1200,
        title: `${reservedCount} ${reservedCount === 1 ? 'immobile riservato' : 'immobili riservati'}: clicca per sbloccare`,
      });
      reservedMarker.on('click', () => onOpenUnlockModal(reservedCount));
      reservedMarker.addTo(map);
      reservedMarkerRef.current = reservedMarker;
    }
  }, [properties, selectedProperty, isAdmin, onSelectProperty, onOpenUnlockModal, isPicking]);

  // Confini del lotto dell'immobile aperto
  const selectedOutline = selectedProperty?.lotBoundary?.outline;
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedOutline?.length || isPicking) return;
    const outline = L.polygon(selectedOutline, LOT_OUTLINE_STYLE).addTo(map);
    return () => {
      outline.remove();
    };
  }, [selectedOutline, isPicking]);

  // Scelta delle particelle: mappa catastale sopra il satellite
  const pickingCenter = parcelPicking?.center;
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isPicking) return;

    const cadastre = L.tileLayer
      .wms(CATASTO_WMS_URL, {
        layers: 'CP.CadastralParcel',
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        crs: CATASTO_CRS,
        opacity: 0.5,
        maxZoom: 20,
        attribution: CATASTO_ATTRIBUTION,
      })
      .addTo(map);
    map.getContainer().classList.add('domina-map-picking');
    if (pickingCenter) {
      map.flyTo(pickingCenter, Math.max(map.getZoom(), FOCUS_ZOOM), { duration: 0.8 });
    }

    return () => {
      cadastre.remove();
      map.getContainer().classList.remove('domina-map-picking');
    };
    // La mappa si centra solo all'inizio della scelta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPicking]);

  const pickedParcels = parcelPicking?.selected;
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !pickedParcels?.length) return;
    const layers = pickedParcels.map((parcel) => L.polygon(parcel.polygons, PICKED_PARCEL_STYLE).addTo(map));
    return () => {
      layers.forEach((layer) => layer.remove());
    };
  }, [pickedParcels]);

  // Lo zoom automatico avviene solo entrando e uscendo da un immobile: nella vista
  // con tutti i pin l'utente decide liberamente zoom e posizione.
  const selectedId = selectedProperty?.id ?? null;
  const selectedCoordinates = selectedProperty?.coordinates;
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (selectedId && selectedCoordinates) {
      // Passando da un pin all'altro resta valida la vista di partenza
      previousViewRef.current ??= { center: map.getCenter(), zoom: map.getZoom() };
      map.flyTo(selectedCoordinates, FOCUS_ZOOM, { animate, duration: 1 });
    } else if (previousViewRef.current) {
      const { center, zoom } = previousViewRef.current;
      previousViewRef.current = null;
      map.flyTo(center, zoom, { animate, duration: 0.8 });
    }
    // Deve scattare solo al cambio di immobile, non a ogni sincronizzazione dei dati
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};

/**
 * Piccola scheda mostrata al passaggio del mouse: immagine, nome e indici calcolati.
 * Costruita con textContent perché i testi arrivano dal database.
 */
function createHoverCard(property: Property): HTMLElement {
  const card = document.createElement('div');

  const image = document.createElement('img');
  image.src = property.image;
  image.alt = '';
  image.onerror = () => image.remove();
  card.appendChild(image);

  const body = document.createElement('div');
  body.className = 'domina-hover-card-body';
  card.appendChild(body);

  const title = document.createElement('strong');
  title.textContent = property.name;
  body.appendChild(title);

  const { status, demolizione: d } = calculateUrbanParameters(getLotData(property), {
    destinazione: 'residenziale',
    modalita: 'demolizione',
  });

  if (status === 'valid' && d) {
    const metrics: [string, string][] = [
      ['Volume', `${formatNumber(d.volFinale)} m³`],
      ['SLP max', `${formatNumber(d.slpProgetto)} m²`],
      ['Coperto max', `${formatNumber(d.covMax)} m²`],
      ['Verde min', `${formatNumber(d.permMin)} m²`],
    ];
    const grid = document.createElement('dl');
    metrics.forEach(([label, value]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = label;
      const definition = document.createElement('dd');
      definition.textContent = value;
      row.append(term, definition);
      grid.appendChild(row);
    });
    body.appendChild(grid);
  } else {
    const note = document.createElement('p');
    note.textContent = 'Indici non disponibili';
    body.appendChild(note);
  }

  return card;
}

const PIN_STYLES: Record<Property['category'], { color: string; icon: string }> = {
  negozi: {
    color: '#2563eb',
    icon: 'M4 10v10h16V10M3 10l1.5-6h15L21 10M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M10 20v-5h4v5',
  },
  capannoni: {
    color: '#7c3aed',
    icon: 'M3 21V9l9-5 9 5v12M8 21v-7h8v7M8 17.5h8',
  },
  altri: {
    color: '#db2777',
    icon: 'M6 21V4h12v17M4 21h16M10 8h.01M14 8h.01M10 12h.01M14 12h.01M10 21v-5h4v5',
  },
};

const LOCK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

/**
 * Pin bianco con disco colorato per tipologia: il bordo chiaro lo stacca dal satellite.
 * In Admin, un pin nascosto agli utenti porta un piccolo lucchetto.
 */
function createTeardropMarkerIcon(
  property: Property,
  isSelected: boolean,
  isAdminHidden: boolean
): L.DivIcon {
  const { color, icon } = PIN_STYLES[property.category] ?? PIN_STYLES.altri;

  const html = `
    <div class="domina-pin ${isSelected ? 'domina-pin-selected' : ''}">
      <svg viewBox="0 0 36 46" aria-hidden="true">
        <path class="domina-pin-body" d="M18 1C8.6 1 1 8.6 1 18c0 12 14.6 25.4 15.8 26.5a1.8 1.8 0 0 0 2.4 0C20.4 43.4 35 30 35 18 35 8.6 27.4 1 18 1Z" />
        <circle cx="18" cy="18" r="13.5" fill="${color}" />
        <svg x="9" y="9" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="${icon}" />
        </svg>
      </svg>
      ${isAdminHidden ? `<span class="domina-pin-lock">${LOCK_ICON}</span>` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'domina-custom-teardrop-marker',
    iconSize: [36, 46],
    iconAnchor: [18, 45],
  });
}

/**
 * Etichetta con il numero di immobili riservati: al clic apre il modulo di sblocco.
 */
function createReservedIcon(count: number): L.DivIcon {
  const html = `
    <div class="domina-locked-pill">
      <span class="domina-locked-pill-icon">${LOCK_ICON}</span>
      <span>${count} ${count === 1 ? 'riservato' : 'riservati'}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'domina-locked-cluster-icon',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
