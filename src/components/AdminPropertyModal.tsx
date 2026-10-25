import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, MapPin, Upload, Link2, Eye, EyeOff, Activity } from 'lucide-react';
import type { Property, PropertyCategory, ActivityStatus } from '../types/property';

interface AdminPropertyModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (prop: Property) => void;
  onDelete?: (id: string) => void;
}

export const AdminPropertyModal: React.FC<AdminPropertyModalProps> = ({
  property,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = !!property;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<PropertyCategory>('negozi');
  const [activityStatus, setActivityStatus] = useState<ActivityStatus>('dismesso');
  const [coveredAreaSqm, setCoveredAreaSqm] = useState<number | ''>('');
  const [lotAreaSqm, setLotAreaSqm] = useState<number | ''>('');
  const [image, setImage] = useState('/images/immobile-001.jpg');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [isVisibleToUser, setIsVisibleToUser] = useState(true);
  const [lat, setLat] = useState('45.4075');
  const [lng, setLng] = useState('11.8800');

  // Health fields for active properties
  const [rev2023, setRev2023] = useState<number>(950000);
  const [margin2023, setMargin2023] = useState<number>(14);
  const [rev2024, setRev2024] = useState<number>(990000);
  const [margin2024, setMargin2024] = useState<number>(15);
  const [rev2025, setRev2025] = useState<number>(1040000);
  const [margin2025, setMargin2025] = useState<number>(16);
  const [activityDescription, setActivityDescription] = useState(
    'Attività commerciale in regolare esercizio con clientela fidelizzata, fatturato in crescita e canone sostenibile.'
  );

  useEffect(() => {
    if (property) {
      setName(property.name);
      setAddress(property.address);
      setCategory(property.category);
      setActivityStatus(property.activityStatus || (property.status === 'Attivo' ? 'attivo' : 'dismesso'));
      setCoveredAreaSqm(property.coveredAreaSqm !== null ? property.coveredAreaSqm : '');
      setLotAreaSqm(property.lotAreaSqm !== null ? property.lotAreaSqm : '');
      setImage(property.image);
      setDescription(property.description);
      setContext(property.context || property.surroundingContext || '');
      setIsVisibleToUser(property.isVisibleToUser !== false);
      setLat(String(property.coordinates[0]));
      setLng(String(property.coordinates[1]));

      if (property.businessHealth) {
        const t = property.businessHealth.revenueTrend;
        if (t && t[0]) {
          setRev2023(t[0].revenue);
          setMargin2023(t[0].margin);
        }
        if (t && t[1]) {
          setRev2024(t[1].revenue);
          setMargin2024(t[1].margin);
        }
        if (t && t[2]) {
          setRev2025(t[2].revenue);
          setMargin2025(t[2].margin);
        }
        setActivityDescription(property.businessHealth.activityDescription || '');
      }
    } else {
      setName('');
      setAddress('');
      setCategory('capannoni');
      setActivityStatus('dismesso');
      setCoveredAreaSqm('');
      setLotAreaSqm('');
      setImage('');
      setDescription('');
      setContext('');
      setIsVisibleToUser(true);
      setLat('45.4075');
      setLng('11.8800');
      setRev2023(950000);
      setMargin2023(14);
      setRev2024(990000);
      setMargin2024(15);
      setRev2025(1040000);
      setMargin2025(16);
      setActivityDescription('');
    }
  }, [property, isOpen]);

  // Handle local file upload (converts to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const categoryLabels: Record<PropertyCategory, string> = {
      negozi: 'Negozio / Locale commerciale',
      capannoni: 'Capannone industriale',
      altri: 'Altri immobili dismessi',
    };

    const parsedLat = parseFloat(lat) || 45.4075;
    const parsedLng = parseFloat(lng) || 11.8800;

    const updatedProp: Property = {
      id: property ? property.id : `domina-immobile-${Date.now()}`,
      name: name.trim() || 'Immobile Padova',
      code: property ? property.code : `PD-LOC-${Math.floor(100 + Math.random() * 900)}`,
      address: address.trim(),
      district: 'Padova',
      city: 'Padova',
      coordinates: [parsedLat, parsedLng],
      category,
      categoryLabel: categoryLabels[category],
      status: activityStatus === 'attivo' ? 'Attivo' : 'Dismesso',
      activityStatus,
      isVisibleToUser,
      condition: activityStatus === 'attivo' ? 'In esercizio' : 'Da ristrutturare',
      statusBadgeColor: activityStatus === 'attivo' ? 'emerald' : 'amber',
      coveredAreaSqm: coveredAreaSqm === '' ? null : Number(coveredAreaSqm),
      lotAreaSqm: lotAreaSqm === '' ? null : Number(lotAreaSqm),
      externalAreaSqm: property?.externalAreaSqm || null,
      clearHeightMeters: property?.clearHeightMeters || null,
      image,
      description: description.trim(),
      context: context.trim(),
      opportunityNotes: property?.opportunityNotes || 'Opportunità di valorizzazione ad elevato potenziale.',
      surroundingContext: context.trim(),
      accessibilityNotes: property?.accessibilityNotes || 'Facilmente accessibile.',
      businessHealth: {
        revenueTrend: [
          { year: '2023', revenue: Number(rev2023), margin: Number(margin2023) },
          { year: '2024', revenue: Number(rev2024), margin: Number(margin2024) },
          { year: '2025', revenue: Number(rev2025), margin: Number(margin2025) },
        ],
        activityDescription: activityDescription.trim(),
      },
      targetProposals: property?.targetProposals || [
        {
          targetCategory: 'Retail Commerciale & Franchising',
          brands: ['Format vicinato', 'Boutique specialistica'],
          matchScore: 94,
          reason: 'Ottima collocazione e metratura flessibile.',
          estimatedReturn: 'Canone stimato di mercato.',
        },
      ],
      urbanPlanning: property?.urbanPlanning || {
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
      pdfPath: property?.pdfPath || '/dossiers/domina-dossier-immobile-001.pdf',
      pdfFileName: property?.pdfFileName || 'domina-dossier-immobile-001.pdf',
      pdfSize: property?.pdfSize || '1.8 MB',
      isDemonstrative: true,
    };

    onSave(updatedProp);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex-none px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0d6e5a] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              ADMIN
            </div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">
              {isEditing ? `Modifica Location: ${property?.name}` : 'Aggiungi Nuova Location'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Nome e Via */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Nome identificativo location
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Ex negozio in via Roma"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#0d6e5a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Via / Indirizzo completo
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="es. Via Roma, 120 - 35131 Padova (PD)"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#0d6e5a]"
                />
              </div>
            </div>
          </div>

          {/* Dicitura Stato: Dismesso vs Attivo */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-wider">
              Dicitura Stato Immobile
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-2.5 rounded-lg border flex items-center space-x-2.5 cursor-pointer transition-all ${
                  activityStatus === 'dismesso'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="activityStatus"
                  value="dismesso"
                  checked={activityStatus === 'dismesso'}
                  onChange={() => setActivityStatus('dismesso')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs">Dismesso</div>
                  <div className="text-[10px] text-gray-500 font-normal">Sfitto o da riqualificare</div>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-lg border flex items-center space-x-2.5 cursor-pointer transition-all ${
                  activityStatus === 'attivo'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="activityStatus"
                  value="attivo"
                  checked={activityStatus === 'attivo'}
                  onChange={() => setActivityStatus('attivo')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-xs flex items-center space-x-1">
                    <span>Attivo</span>
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-[10px] text-gray-500 font-normal">Mostra stato salute attività</div>
                </div>
              </label>
            </div>
          </div>

          {/* Se Attivo: Campi modificabili fatturato e descrizione corta */}
          {activityStatus === 'attivo' && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide block">
                Dati Stato Attività (Fatturato & Margine)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">2023 (€)</label>
                  <input
                    type="number"
                    value={rev2023}
                    onChange={(e) => setRev2023(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs bg-white"
                  />
                  <div className="flex items-center space-x-1 mt-1 text-[10px]">
                    <span className="text-gray-400">Margine%:</span>
                    <input
                      type="number"
                      value={margin2023}
                      onChange={(e) => setMargin2023(Number(e.target.value))}
                      className="w-12 px-1 py-0.5 rounded border border-gray-300 text-[10px] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">2024 (€)</label>
                  <input
                    type="number"
                    value={rev2024}
                    onChange={(e) => setRev2024(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs bg-white"
                  />
                  <div className="flex items-center space-x-1 mt-1 text-[10px]">
                    <span className="text-gray-400">Margine%:</span>
                    <input
                      type="number"
                      value={margin2024}
                      onChange={(e) => setMargin2024(Number(e.target.value))}
                      className="w-12 px-1 py-0.5 rounded border border-gray-300 text-[10px] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">2025 (€)</label>
                  <input
                    type="number"
                    value={rev2025}
                    onChange={(e) => setRev2025(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs bg-white"
                  />
                  <div className="flex items-center space-x-1 mt-1 text-[10px]">
                    <span className="text-gray-400">Margine%:</span>
                    <input
                      type="number"
                      value={margin2025}
                      onChange={(e) => setMargin2025(Number(e.target.value))}
                      className="w-12 px-1 py-0.5 rounded border border-gray-300 text-[10px] bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-700 uppercase mb-1">
                  Descrizione attività (corta, modificabile)
                </label>
                <textarea
                  rows={2}
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="Descrizione corta dell'attività..."
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:border-[#0d6e5a]"
                />
              </div>
            </div>
          )}

          {/* Metri quadri totali e Superficie coperta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Superficie Coperta (m²)
              </label>
              <input
                type="number"
                value={coveredAreaSqm}
                onChange={(e) => setCoveredAreaSqm(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="es. 180"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#0d6e5a]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Metri Quadri Totali / Lotto (m²)
              </label>
              <input
                type="number"
                value={lotAreaSqm}
                onChange={(e) => setLotAreaSqm(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="es. 220"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#0d6e5a]"
              />
            </div>
          </div>

          {/* Tipologia */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Tipologia Immobile
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as PropertyCategory)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:border-[#0d6e5a]"
            >
              <option value="negozi">Negozi e locali commerciali</option>
              <option value="capannoni">Capannoni industriali</option>
              <option value="altri">Altri immobili dismessi</option>
            </select>
          </div>

          {/* Caricamento Foto: Upload da computer o Link URL */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <label className="block text-[11px] font-bold text-gray-800 uppercase tracking-wider">
              Fotografia Location (Carica file o inserisci link)
            </label>

            {/* Current preview */}
            {image && (
              <div className="relative h-28 w-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                <img src={image} alt="Anteprima" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-2 px-1.5 py-0.5 rounded text-[9px] bg-black/60 text-white">
                  Anteprima foto
                </span>
              </div>
            )}

            {/* File Upload Button */}
            <div className="flex items-center space-x-2">
              <label className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer flex items-center justify-center space-x-1.5 text-xs font-semibold shadow-2xs transition-colors">
                <Upload className="w-4 h-4 text-[#0d6e5a]" />
                <span>Carica foto dal computer</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* URL input */}
            <div className="space-y-1">
              <div className="relative">
                <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="Incolla link/URL alla foto (es. Imgur, Postimages, link web)..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white focus:outline-none focus:border-[#0d6e5a]"
                />
              </div>
              <p className="text-[10px] text-gray-500">
                💡 Per il database cloud puoi caricare la foto su <strong>Imgur</strong> e incollare il link qui.
              </p>
            </div>
          </div>

          {/* Visibilità per l'Utente (Pallino Numerico) */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
                {isVisibleToUser ? (
                  <>
                    <Eye className="w-4 h-4 text-[#0d6e5a]" />
                    <span>Mostra all'utente normalmente</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-amber-600" />
                    <span>Nascondi nel pallino numerico</span>
                  </>
                )}
              </span>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVisibleToUser}
                  onChange={(e) => setIsVisibleToUser(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0d6e5a]"></div>
              </label>
            </div>
          </div>

          {/* Descrizione & Contesto */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Descrizione
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#0d6e5a]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
              Contesto
            </label>
            <textarea
              rows={2}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-[#0d6e5a]"
            />
          </div>

          {/* Coordinate Geografiche */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Latitudine
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Longitudine
              </label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900"
              />
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="flex-none p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Sei sicuro di voler eliminare "${property?.name}"?`)) {
                    onDelete(property!.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina pin</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold transition-colors"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-[#0d6e5a] hover:bg-[#095747] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Salva modifiche' : 'Crea location'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
