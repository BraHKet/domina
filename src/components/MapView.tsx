import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Property } from '../types/property';

interface MapViewProps {
  properties: Property[];
  selectedProperty: Property | null;
  isAdmin: boolean;
  onSelectProperty: (property: Property) => void;
  onOpenUnlockModal: (count: number) => void;
  onMapClickAddLocation?: (lat: number, lng: number) => void;
}

const PADOVA_CENTER: [number, number] = [45.4075, 11.879];
const INITIAL_ZOOM = 13;

export const MapView: React.FC<MapViewProps> = ({
  properties,
  selectedProperty,
  isAdmin,
  onSelectProperty,
  onOpenUnlockModal,
  onMapClickAddLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const clusterMarkerRef = useRef<L.Marker | null>(null);

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

    // Clean OpenStreetMap tiles (free, reliable, no watermark)
    // Supports custom API key via VITE_MAP_API_KEY or custom URL via VITE_MAP_TILE_URL
    const apiKey = import.meta.env.VITE_MAP_API_KEY;
    const customTileUrl = import.meta.env.VITE_MAP_TILE_URL;

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (customTileUrl) {
      tileUrl = customTileUrl;
    } else if (apiKey) {
      tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${apiKey}`;
      attribution = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    }

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: attribution,
    }).addTo(map);

    // Admin map click to add location
    map.on('click', (e: L.LeafletMouseEvent) => {
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

    if (clusterMarkerRef.current) {
      clusterMarkerRef.current.remove();
      clusterMarkerRef.current = null;
    }

    // Segregate visible vs hidden properties
    const visibleProperties = isAdmin
      ? properties
      : properties.filter((p) => p.isVisibleToUser !== false);

    const hiddenProperties = properties.filter((p) => p.isVisibleToUser === false);

    // 1. Render standard pins
    visibleProperties.forEach((prop) => {
      const isSelected = selectedProperty?.id === prop.id;
      const isHidden = prop.isVisibleToUser === false;
      const icon = createTeardropMarkerIcon(prop, isSelected, isAdmin && isHidden);

      const marker = L.marker(prop.coordinates, {
        icon: icon,
        title: prop.name,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.on('click', () => {
        onSelectProperty(prop);
      });

      marker.addTo(map);
      markersRef.current[prop.id] = marker;
    });

    // 2. In USER mode, if there are hidden properties:
    // Render the ROUND CIRCULAR CLUSTER PIN with the number of hidden locations!
    if (!isAdmin && hiddenProperties.length > 0) {
      // Calculate centroid of hidden properties (or default near Padova center)
      const avgLat =
        hiddenProperties.reduce((sum, p) => sum + p.coordinates[0], 0) / hiddenProperties.length ||
        45.412;
      const avgLng =
        hiddenProperties.reduce((sum, p) => sum + p.coordinates[1], 0) / hiddenProperties.length ||
        11.905;

      const clusterIcon = createLockedClusterIcon(hiddenProperties.length);

      const clusterMarker = L.marker([avgLat, avgLng], {
        icon: clusterIcon,
        zIndexOffset: 1200,
        title: `${hiddenProperties.length} opportunità riservate - Clicca per sbloccare`,
      });

      clusterMarker.on('click', () => {
        onOpenUnlockModal(hiddenProperties.length);
      });

      clusterMarker.addTo(map);
      clusterMarkerRef.current = clusterMarker;
    }
  }, [properties, selectedProperty, isAdmin, onSelectProperty, onOpenUnlockModal]);

  // Center when selected
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedProperty) return;

    map.flyTo(selectedProperty.coordinates, 14, {
      duration: 0.8,
      easeLinearity: 0.25,
    });
  }, [selectedProperty]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#eef2f5]">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};

/**
 * Creates the exact teardrop pin matching the reference screenshot.
 * In Admin mode, if the pin is hidden from users, it shows a subtle lock badge.
 */
function createTeardropMarkerIcon(
  property: Property,
  isSelected: boolean,
  isAdminHidden: boolean
): L.DivIcon {
  const isCapannone = property.category === 'capannoni';
  const pinColor = isCapannone ? '#0d6e5a' : '#142a3a';

  let innerIconSvg = '';
  if (property.category === 'capannoni') {
    innerIconSvg = `
      <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    `;
  } else {
    innerIconSvg = `
      <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    `;
  }

  const selectedClass = isSelected ? 'domina-marker-selected' : '';
  const ringHtml = isSelected
    ? `<div class="absolute -inset-1 rounded-full border-2 border-[#0d6e5a] animate-ping opacity-60"></div>`
    : '';

  const adminLockBadge = isAdminHidden
    ? `<div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border border-white flex items-center justify-center text-white text-[9px] shadow-sm font-bold">🔒</div>`
    : '';

  const html = `
    <div class="relative flex items-center justify-center domina-marker-pin ${selectedClass}" style="width: 32px; height: 42px;">
      ${ringHtml}
      ${adminLockBadge}
      <svg viewBox="0 0 32 42" fill="none" class="w-full h-full drop-shadow-md">
        <path
          d="M16 0C7.163 0 0 7.163 0 16C0 27.2 14.2 40.8 14.8 41.4C15.4 42 16.6 42 17.2 41.4C17.8 40.8 32 27.2 32 16C32 7.163 24.837 0 16 0Z"
          fill="${pinColor}"
        />
        <circle cx="16" cy="16" r="10.5" fill="${pinColor}" />
      </svg>
      <div class="absolute top-[8px] left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
        ${innerIconSvg}
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'domina-custom-teardrop-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

/**
 * Creates the round circular cluster badge with the number of hidden locations.
 * Clicking this triggers the "Sblocca opportunità riservate" email modal.
 */
function createLockedClusterIcon(count: number): L.DivIcon {
  const html = `
    <div class="relative flex items-center justify-center cursor-pointer transform hover:scale-110 transition-transform" style="width: 52px; height: 52px;">
      <!-- Glowing pulse ring -->
      <div class="absolute inset-0 rounded-full bg-amber-500 opacity-25 animate-ping"></div>
      
      <!-- Outer circle -->
      <div class="relative w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-2 border-white shadow-xl flex flex-col items-center justify-center text-white">
        <div class="text-[9px] font-black uppercase tracking-tighter opacity-90 leading-none">RISERVATE</div>
        <div class="text-sm font-black leading-none mt-0.5">${count}</div>
      </div>

      <!-- Lock badge -->
      <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-white text-white flex items-center justify-center text-[10px] shadow-sm">
        🔒
      </div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'domina-locked-cluster-icon',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });
}
