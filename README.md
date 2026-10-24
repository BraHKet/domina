# Domina — Real Estate Location Intelligence (Padova MVP)

Mini MVP di **Domina**, piattaforma di Real Estate Location Intelligence per individuare e valorizzare opportunità commerciali e industriali dismesse o attive a Padova.

## 🚀 Caratteristiche Principali

- **Mappa Interattiva**: Esplorazione cartografica con OpenStreetMap ad alta risoluzione centrata su Padova, pin categorizzati (Attivo vs Dismesso) e raggruppamento protetto per location riservate.
- **Filtri & Ricerca**: Ricerca per via/quartiere e filtri rapidi per tipologia (Ex Negozi, Capannoni, Attività Attive).
- **Scheda Immobile Dettagliata**: Metri quadri totali, superficie coperta, via e galleria fotografica.
- **Stato di Salute Attività**: Per gli immobili attivi, visualizzazione dell'andamento storico di fatturato e margine (2023 - 2025) con descrizione strategica.
- **Lead Generation**: Call-to-action per "Vedi analisi urbanistica", "Dimmi a chi proporla" e "Trova il proprietario" con salvataggio contatti.
- **Pannello Admin Riservato**: Accesso protetto (via route `/admin` o trigger riservato) per aggiungere, modificare o rimuovere location, caricare foto da dispositivo o URL, e scegliere quali immobili rendere visibili o raggruppare.

## 🛠️ Stack Tecnologico

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Mappe**: Leaflet, React-Leaflet
- **Icone**: Lucide React
- **Persistenza**: LocalStorage con dataset precaricato

## 📦 Installazione e Avvio Locale

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Compila per la produzione
npm run build

# Anteprima build
npm run preview
```
