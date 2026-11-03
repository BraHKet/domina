import { calculateUrbanParameters } from './urbanCalculationEngine.ts';

function assertApprox(actual: number | null | undefined, expected: number, tolerance = 0.01, label = '') {
  if (actual === undefined || actual === null) {
    throw new Error(`[FAIL] ${label}: actual is ${actual}, expected ${expected}`);
  }
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`[FAIL] ${label}: actual ${actual} differs from expected ${expected} (diff: ${Math.abs(actual - expected)})`);
  }
  console.log(`  ✓ ${label}: ${actual} ≈ ${expected}`);
}

function assertStrict(actual: unknown, expected: unknown, label = '') {
  if (actual !== expected) {
    throw new Error(`[FAIL] ${label}: actual "${actual}" !== expected "${expected}"`);
  }
  console.log(`  ✓ ${label}: "${actual}" === "${expected}"`);
}

console.log('--- TEST 1: Non commerciale, St 5.000, SLP 1.000, nessuna premialità, H 12 ---');
{
  const res = calculateUrbanParameters(
    {
      zona: 'C1',
      comune: 'Padova',
      perc_in_zona: 100,
      st: 5000,
      slp: 1000,
      cop: 500,
      sco: 4500,
    },
    {
      destinazione: 'residenziale',
      modalita: 'demolizione',
      h: 12,
    }
  );

  assertStrict(res.status, 'valid', 'Stato calcolo');
  const d = res.demolizione!;
  assertApprox(d.volFinale, 3000, 0.01, 'Volume 3.000 mc');
  assertStrict(d.procedura, 'PUA obbligatorio', 'PUA');
  assertApprox(d.sf, 3500, 0.01, 'Sf 3.500 mq');
  assertApprox(d.cessione, 1500, 0.01, 'Cessione 1.500 mq');
  assertApprox(d.covMax, 1400, 0.01, 'CovMax 1.400 mq');
  assertApprox(d.permMin, 1050, 0.01, 'PermMin 1.050 mq');
  assertApprox(d.parcheggi, 1050, 0.01, 'Parcheggi 1.050 mq');
  assertStrict(d.alberi, 30, 'Alberi 30');
  assertApprox(d.distanze.dc, 6, 0.01, 'Dc 6 m (max(5, 12/2))');
}

console.log('\n--- TEST 2: Non commerciale, St 1.000, SLP 100 ---');
{
  const res = calculateUrbanParameters(
    {
      zona: 'C1',
      comune: 'Padova',
      perc_in_zona: 100,
      st: 1000,
      slp: 100,
      cop: 200,
      sco: 800,
    },
    {
      destinazione: 'residenziale',
      modalita: 'demolizione',
    }
  );

  assertStrict(res.status, 'valid', 'Stato calcolo');
  const d = res.demolizione!;
  assertApprox(d.volBase, 500, 0.01, 'VolBase 500 mc (minimo garantito)');
  assertStrict(d.procedura, 'PCC oppure IED con atto d\'obbligo', 'PCC o IED');
  assertApprox(d.sf, 700, 0.01, 'Sf 700 mq');
  assertApprox(d.cessione, 300, 0.01, 'Cessione 300 mq');
  assertApprox(d.covMax, 280, 0.01, 'CovMax 280 mq');
  assertApprox(d.parcheggi, 210, 0.01, 'Parcheggi 210 mq');
  assertStrict(d.alberi, 6, 'Alberi 6');
}

console.log('\n--- TEST 3: Come il caso 2 con TV = 50 ---');
{
  const res = calculateUrbanParameters(
    {
      zona: 'C1',
      comune: 'Padova',
      perc_in_zona: 100,
      st: 1000,
      slp: 100,
      cop: 200,
      sco: 800,
    },
    {
      destinazione: 'residenziale',
      modalita: 'demolizione',
      tv: 50,
    }
  );

  assertStrict(res.status, 'valid', 'Stato calcolo');
  const d = res.demolizione!;
  assertApprox(d.permTerra, 110, 0.01, 'PermTerra 110 mq');
  assertApprox(d.parcheggi, 310, 0.01, 'Parcheggi 310 mq');
}

console.log('\n--- TEST 4: Commerciale, St 5.000, SLP 0, premialità +30% e +10% (k = 1,4), Sv 1.000 ---');
{
  const res = calculateUrbanParameters(
    {
      zona: 'C1',
      comune: 'Padova',
      perc_in_zona: 100,
      st: 5000,
      slp: 0,
      cop: 0,
      sco: 5000,
    },
    {
      destinazione: 'commerciale',
      modalita: 'demolizione',
      sv: 1000,
      premialita: {
        recredOrErs: true, // +30%
        camEdilizia: true, // +10%
      },
    }
  );

  assertStrict(res.status, 'valid', 'Stato calcolo');
  const d = res.demolizione!;
  assertApprox(d.k, 1.4, 0.001, 'k = 1,4');
  assertApprox(d.slpMin, 833.33, 0.05, 'SLPmin 833,33 mq');
  assertApprox(d.slpProgetto, 1166.67, 0.05, 'SLPprogetto 1.166,67 mq');
  assertStrict(res.ammissibilita.commercialVerdict, 'MSV consentito', 'MSV consentito');
}

console.log('\n--- TEST 5: Controllo soglia multi-zona (< 95%) ---');
{
  const res = calculateUrbanParameters(
    {
      zona: 'C1',
      comune: 'Padova',
      perc_in_zona: 90, // < 95%
      st: 1000,
      slp: 100,
    },
    {
      destinazione: 'residenziale',
      modalita: 'demolizione',
    }
  );

  assertStrict(res.status, 'multi_zone_manual_check', 'Stato multi-zona');
  assertStrict(res.ammissibilita.verdettoTestuale, 'lotto in più zone: verifica manuale', 'Verdetto manuale');
}

console.log('\n--- TEST 6: Controllo dati mancanti ---');
{
  const res = calculateUrbanParameters(
    {
      zona: 'C1',
      comune: 'Padova',
      perc_in_zona: 100,
      st: undefined as unknown as number,
      slp: 100,
    },
    {
      destinazione: 'residenziale',
      modalita: 'demolizione',
    }
  );

  assertStrict(res.status, 'missing_data', 'Stato missing data');
  assertStrict(res.missingFields.includes('St (superficie territoriale)'), true, 'Campo St mancante segnalato');
}

console.log('\n--- TEST 7: Modalità mantenimento ---');
{
  const res = calculateUrbanParameters(
    {
      zona: 'C1',
      comune: 'Padova',
      perc_in_zona: 100,
      cop: 350,
      sco: 650,
      vol: 1050,
      slp: 320,
    },
    {
      destinazione: 'residenziale',
      modalita: 'mantenimento',
    }
  );

  assertStrict(res.status, 'valid', 'Stato calcolo mantenimento');
  assertStrict(res.mantenimento?.procedura, 'Intervento tramite IED', 'Procedura IED');
  assertStrict(res.mantenimento?.cop, 350, 'Cop 350');
  assertStrict(res.mantenimento?.sco, 650, 'Sco 650');
}

console.log('\nTUTTI I 7 TEST SONO STATI SUPERATI CON SUCCESSO! 🎉');
