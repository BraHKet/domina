// properties e defaultSelected ora vengono da useProperties()
// comparabili ora viene da useOmi()

export const ristrutturazione = {
  costiStimati: 25000,
  tasse: 7500,
  prezzoRivendita: 110000,
  profittoStimato: 22000,
}

export const acquirenteData = {
  eta: '40-59',
  professione: 'Operaio',
  salario: '€2.000 salario medio',
  budgetMin: 100000,
  budgetMax: 120000,
  cercano: 'Bilocale',
  priorita: 'Ascensore, luce natur.',
  descrizione:
    "Gli acquirenti qui sono tipicamente famiglie e professionisti di mezza età alla ricerca di case accessibili. Nonostante le sue difficoltà, Barriera di Milano si sta evolvendo grazie ai continui interventi di riqualificazione e ai prezzi immobiliari accessibili.",
}

export const demograficaData = {
  familyStatus: [
    { label: 'Single', percentage: 20 },
    { label: 'Sposati', percentage: 30 },
    { label: 'Con figli', percentage: 50 },
  ],
  ageDistribution: [
    { eta: 20, count: 11 },
    { eta: 25, count: 10 },
    { eta: 30, count: 14 },
    { eta: 35, count: 16 },
    { eta: 40, count: 22 },
    { eta: 45, count: 26 },
    { eta: 50, count: 34 },
    { eta: 55, count: 28 },
    { eta: 60, count: 24 },
    { eta: 65, count: 32 },
    { eta: 70, count: 43 },
  ],
  target: 32,
  notizie: [
    'Riqualificazione di Corso Giulio Cesare inizio da Giugno 2026',
    'I lavori di riqualificazione sono iniziati',
    'Rapina su Via Sempione ieri',
  ],
  cantieri: [{ lat: 45.0945, lng: 7.6870 }],
  zoneRischio: [{ lat: 45.0905, lng: 7.6840, radius: 150 }],
}