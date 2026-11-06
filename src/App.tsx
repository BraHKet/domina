import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type {
  Property,
  PropertyCategory,
  LeadSubmission,
  ClickSource,
  CadastralParcel,
  LotBoundary,
} from './types/property';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { MapView, type ParcelPickingState } from './components/MapView';
import { ParcelPickerBar } from './components/ParcelPickerBar';
import { buildLotBoundary, fetchParcelAt } from './utils/cadastre';
import { PropertyFocusView } from './components/PropertyFocusView';
import { UnlockModal } from './components/UnlockModal';
import { AdminPropertyModal } from './components/AdminPropertyModal';
import { AdminLeadsModal } from './components/AdminLeadsModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import {
  getStoredProperties,
  saveStoredProperties,
  saveProperty,
  deleteProperty,
  fetchRemoteProperties,
  fetchRemoteGoogleSheetData,
  resetStoredProperties,
  getStoredLeads,
  saveStoredLeads,
  saveStoredClicks,
  getStoredAdminAuth,
  setStoredAdminAuth,
  recordClick,
} from './utils/storage';

export const App: React.FC = () => {
  // Properties state
  const [properties, setProperties] = useState<Property[]>(() => getStoredProperties());
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [hasSelectedOnce, setHasSelectedOnce] = useState(false);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategory | 'all'>('all');

  // Hidden Admin State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => getStoredAdminAuth());
  const [adminLoginOpen, setAdminLoginOpen] = useState<boolean>(false);

  // Leads
  const [leads, setLeads] = useState<LeadSubmission[]>(() => getStoredLeads());

  // Unified Lead / Unlock Modal State
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockSourceKey, setUnlockSourceKey] = useState<ClickSource>('cluster_riservato');
  const [unlockTitle, setUnlockTitle] = useState('Sblocca le location');
  const [unlockPropertyName, setUnlockPropertyName] = useState<string | undefined>(undefined);
  const [unlockHiddenCount, setUnlockHiddenCount] = useState<number | undefined>(undefined);

  // Admin Modals
  const [adminPropModalOpen, setAdminPropModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [adminLeadsModalOpen, setAdminLeadsModalOpen] = useState(false);

  // Scelta delle particelle catastali (Admin): il modulo resta aperto ma nascosto
  const [parcelPicker, setParcelPicker] = useState<{
    center: [number, number];
    selected: CadastralParcel[];
    pending: number; // ricerche ancora in corso: il catasto può impiegare 20 secondi
    message: string | null;
  } | null>(null);
  const parcelConfirmRef = useRef<((boundary: LotBoundary | null) => void) | null>(null);

  // Check URL on load for /admin or #admin
  useEffect(() => {
    const checkAdminUrl = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();

      if (path.includes('admin') || hash.includes('admin') || search.includes('admin')) {
        if (!getStoredAdminAuth()) {
          setAdminLoginOpen(true);
        }
      }
    };

    checkAdminUrl();
    window.addEventListener('popstate', checkAdminUrl);
    return () => window.removeEventListener('popstate', checkAdminUrl);
  }, []);

  // Sincronizza tutti i dati dai Database Google Sheets (Immobili, Lead e Clic) ad ogni ricaricamento della scheda e al cambio focus
  useEffect(() => {
    let isMounted = true;

    const syncAll = () => {
      // 1. Sincronizzazione database immobili
      fetchRemoteProperties()
        .then((remoteProps) => {
          if (isMounted && remoteProps !== null) {
            setProperties(remoteProps);
            saveStoredProperties(remoteProps);
            // Aggiorna solo l'immobile già aperto: la sincronizzazione non deve mai muovere la mappa
            setSelectedProperty((prev) =>
              prev ? remoteProps.find((p) => p.id === prev.id) || null : null
            );
          }
        })
        .catch((err) => {
          console.warn('Google Sheets cloud properties sync warning:', err);
        });

      // 2. Sincronizzazione database statistiche (Lead raccolti e Clic tracciati)
      fetchRemoteGoogleSheetData()
        .then((remoteData) => {
          if (!isMounted || !remoteData) return;

          if (remoteData.leads && Array.isArray(remoteData.leads)) {
            setLeads(remoteData.leads);
            saveStoredLeads(remoteData.leads);
          }

          if (remoteData.clicks && Array.isArray(remoteData.clicks)) {
            saveStoredClicks(remoteData.clicks);
          }
        })
        .catch((err) => {
          console.warn('Google Sheets cloud leads/clicks sync warning:', err);
        });
    };

    // Esegui subito al montaggio
    syncAll();

    // Sincronizza automaticamente anche quando l'utente torna sulla scheda o riattiva la finestra (es. tra dispositivi diversi)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAll();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', syncAll);

    return () => {
      isMounted = false;
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', syncAll);
    };
  }, []);

  // Keyboard shortcut: ESC closes open cards/modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (unlockModalOpen) setUnlockModalOpen(false);
        else if (adminLoginOpen) setAdminLoginOpen(false);
        else if (adminPropModalOpen) setAdminPropModalOpen(false);
        else if (adminLeadsModalOpen) setAdminLeadsModalOpen(false);
        else if (selectedProperty) setSelectedProperty(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    unlockModalOpen,
    adminLoginOpen,
    adminPropModalOpen,
    adminLeadsModalOpen,
    selectedProperty,
  ]);

  // Admin Login success
  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setStoredAdminAuth(true);
  };

  // Admin Logout
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setStoredAdminAuth(false);
    if (window.location.pathname.includes('admin') || window.location.hash.includes('admin')) {
      window.history.replaceState(null, '', '/');
    }
  };

  // Filtered Properties for Map
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      if (selectedCategory !== 'all' && prop.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = prop.name.toLowerCase().includes(q);
        const matchesAddress = prop.address.toLowerCase().includes(q);
        const matchesDistrict = prop.district.toLowerCase().includes(q);
        if (!matchesName && !matchesAddress && !matchesDistrict) {
          return false;
        }
      }

      return true;
    });
  }, [properties, selectedCategory, searchQuery]);

  // Count of properties visible to regular user
  const userVisibleCount = useMemo(() => {
    return properties.filter((p) => p.isVisibleToUser !== false).length;
  }, [properties]);

  // Admin Property Save (Create / Update in Database & Local)
  const handleSaveProperty = (savedProp: Property) => {
    const updatedList = saveProperty(savedProp, properties);
    setProperties(updatedList);
    setHasSelectedOnce(true);
    setSelectedProperty(savedProp);
  };

  // Admin Property Delete (Delete from Database & Local)
  const handleDeleteProperty = (id: string) => {
    const target = properties.find((p) => p.id === id);
    const updatedList = deleteProperty(id, properties, target);
    setProperties(updatedList);
    if (selectedProperty?.id === id) {
      setSelectedProperty(null);
    }
  };

  // Admin Quick Toggle Visibility
  const handleToggleVisibility = (property: Property) => {
    const updated = {
      ...property,
      isVisibleToUser: !(property.isVisibleToUser !== false),
    };
    handleSaveProperty(updated);
  };

  // Admin Reset Default Data
  const handleResetData = () => {
    if (confirm('Vuoi ripristinare il dataset predefinito iniziale?')) {
      const reset = resetStoredProperties();
      setProperties(reset);
      setSelectedProperty(null);
    }
  };

  // Trigger Action from Card Buttons ("Vedi analisi urbanistica", "Dimmi a chi proporla", "Trova il proprietario")
  const handleCardRequestAction = (
    actionType: 'analisi' | 'target' | 'proprietario',
    prop: Property
  ) => {
    const sourceKeys: Record<string, ClickSource> = {
      analisi: 'analisi_urbanistica',
      target: 'dimmi_a_chi_proporla',
      proprietario: 'trova_proprietario',
    };
    const titles: Record<string, string> = {
      analisi: 'Perizia completa',
      target: 'Dimmi a chi proporla',
      proprietario: 'Trova il proprietario',
    };
    const labels: Record<string, string> = {
      analisi: 'Richiedi perizia completa',
      target: 'Dimmi a chi proporla',
      proprietario: 'Trova il proprietario',
    };

    const key = sourceKeys[actionType] || 'analisi_urbanistica';
    const label = labels[actionType] || 'Vedi analisi';

    // Track click event immediately
    recordClick(key, label, prop.name, prop.address);

    setUnlockSourceKey(key);
    setUnlockTitle(titles[actionType] || 'Sblocca le location');
    setUnlockPropertyName(prop.name);
    setUnlockHiddenCount(undefined);
    setUnlockModalOpen(true);
  };

  // Click on the locked round pin on the map
  const handleOpenClusterUnlock = useCallback((count: number) => {
    // Track cluster click event
    recordClick('cluster_riservato', 'Pin cluster riservati', undefined, `${count} immobili`);

    setUnlockSourceKey('cluster_riservato');
    setUnlockTitle('Opportunità riservate');
    setUnlockPropertyName(undefined);
    setUnlockHiddenCount(count);
    setUnlockModalOpen(true);
  }, []);

  // Un secondo clic sullo stesso pin torna alla vista precedente
  const handleSelectProperty = useCallback((property: Property) => {
    setHasSelectedOnce(true);
    setSelectedProperty((prev) => (prev?.id === property.id ? null : property));
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedProperty(null);
  }, []);

  const handleStartParcelPicking = useCallback(
    (
      current: LotBoundary | null,
      center: [number, number],
      onConfirm: (boundary: LotBoundary | null) => void
    ) => {
      parcelConfirmRef.current = onConfirm;
      setParcelPicker({ center, selected: current?.parcels ?? [], pending: 0, message: null });
    },
    []
  );

  // Un clic aggiunge la particella sotto il puntatore, un secondo clic la toglie
  const handlePickParcel = useCallback(async (lat: number, lng: number) => {
    setParcelPicker((prev) => (prev ? { ...prev, pending: prev.pending + 1, message: null } : prev));
    try {
      const parcel = await fetchParcelAt(lat, lng);
      setParcelPicker((prev) => {
        if (!prev) return prev;
        const pending = Math.max(0, prev.pending - 1);
        if (!parcel) {
          return { ...prev, pending, message: 'Qui non c’è una particella: strade e acque non lo sono.' };
        }
        const already = prev.selected.some((p) => p.id === parcel.id);
        return {
          ...prev,
          pending,
          selected: already ? prev.selected.filter((p) => p.id !== parcel.id) : [...prev.selected, parcel],
        };
      });
    } catch (error) {
      setParcelPicker((prev) =>
        prev
          ? {
              ...prev,
              pending: Math.max(0, prev.pending - 1),
              message: error instanceof Error ? error.message : 'Catasto non raggiungibile',
            }
          : prev
      );
    }
  }, []);

  const handleFinishParcelPicking = (confirm: boolean) => {
    if (confirm && parcelPicker) {
      parcelConfirmRef.current?.(parcelPicker.selected.length ? buildLotBoundary(parcelPicker.selected) : null);
    }
    parcelConfirmRef.current = null;
    setParcelPicker(null);
  };

  const parcelPicking: ParcelPickingState | null = useMemo(
    () =>
      parcelPicker
        ? { center: parcelPicker.center, selected: parcelPicker.selected, onPick: handlePickParcel }
        : null,
    [parcelPicker, handlePickParcel]
  );

  const handleMapClickAddLocation = (_lat: number, _lng: number) => {
    setEditingProperty(null);
    setAdminPropModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 text-gray-800 overflow-hidden font-sans">
      {/* 1. Top Dark Navbar with Hidden Admin Access */}
      <Header
        isAdmin={isAdmin}
        onLogoutAdmin={handleAdminLogout}
        onAddNewLocation={() => {
          setEditingProperty(null);
          setAdminPropModalOpen(true);
        }}
        onOpenLeads={() => setAdminLeadsModalOpen(true)}
        leadsCount={leads.length}
        onResetData={handleResetData}
        onTriggerHiddenLogin={() => setAdminLoginOpen(true)}
      >
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          totalCount={isAdmin ? properties.length : userVisibleCount}
          filteredCount={
            isAdmin
              ? filteredProperties.length
              : filteredProperties.filter((p) => p.isVisibleToUser !== false).length
          }
        />
      </Header>

      {/* Mappa a tutto schermo con le schede dell'immobile sopra */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Full-screen Leaflet Map */}
        <MapView
          properties={filteredProperties}
          selectedProperty={selectedProperty}
          isAdmin={isAdmin}
          onSelectProperty={handleSelectProperty}
          onOpenUnlockModal={handleOpenClusterUnlock}
          onMapClickAddLocation={handleMapClickAddLocation}
          parcelPicking={parcelPicking}
        />

        {!selectedProperty && !hasSelectedOnce && !parcelPicker && (
          <p className="domina-map-hint">Clicca un pin per scoprire cosa puoi costruire</p>
        )}

        {parcelPicker && (
          <ParcelPickerBar
            selected={parcelPicker.selected}
            pending={parcelPicker.pending}
            message={parcelPicker.message}
            onCancel={() => handleFinishParcelPicking(false)}
            onConfirm={() => handleFinishParcelPicking(true)}
          />
        )}

        {selectedProperty && !parcelPicker && (
          <PropertyFocusView
            key={selectedProperty.id}
            property={selectedProperty}
            isAdmin={isAdmin}
            onBack={handleCloseCard}
            onRequestAction={handleCardRequestAction}
            onEditProperty={(prop) => {
              setEditingProperty(prop);
              setAdminPropModalOpen(true);
            }}
            onToggleVisibility={handleToggleVisibility}
          />
        )}
      </main>

      {/* Concise Lead Popup for all actions and locked cluster pin */}
      <UnlockModal
        isOpen={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        sourceKey={unlockSourceKey}
        sourceTitle={unlockTitle}
        propertyName={unlockPropertyName}
        hiddenCount={unlockHiddenCount}
        onLeadSaved={() => setLeads(getStoredLeads())}
      />

      {/* Hidden Admin Login Modal (/admin) */}
      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Location Edit & Add Modal */}
      <AdminPropertyModal
        isOpen={adminPropModalOpen}
        onClose={() => setAdminPropModalOpen(false)}
        property={editingProperty}
        onSave={handleSaveProperty}
        onDelete={handleDeleteProperty}
        isHidden={parcelPicker !== null}
        onPickParcels={handleStartParcelPicking}
      />

      {/* Admin Leads Modal */}
      <AdminLeadsModal
        isOpen={adminLeadsModalOpen}
        onClose={() => setAdminLeadsModalOpen(false)}
        leads={leads}
        onLeadsUpdated={(updatedLeads) => {
          setLeads(updatedLeads);
          saveStoredLeads(updatedLeads);
        }}
      />
    </div>
  );
};

export default App;
