// Inoltra al servizio WFS dell'Agenzia delle Entrate la ricerca di una particella catastale.
// Serve perché il servizio non accetta chiamate dirette dal browser.
// Accetta solo la ricerca di particelle, così non diventa un inoltro aperto verso altri siti.

const TARGET = 'https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php';
const USER_AGENT = 'Domina/0.1 (consultazione particelle catastali)';
const ALLOWED_PARAMS = ['SERVICE', 'VERSION', 'REQUEST', 'TYPENAMES', 'SRSNAME', 'BBOX', 'COUNT'];

export default async function handler(req, res) {
  const incoming = new URL(req.url, 'http://localhost').searchParams;
  const params = new URLSearchParams();
  ALLOWED_PARAMS.forEach((name) => {
    const value = incoming.get(name);
    if (value !== null) params.set(name, value);
  });

  if (params.get('REQUEST') !== 'GetFeature' || params.get('TYPENAMES') !== 'CP:CadastralParcel') {
    res.status(400).send('Richiesta non ammessa');
    return;
  }

  try {
    const upstream = await fetch(`${TARGET}?${params.toString()}`, {
      headers: { 'user-agent': USER_AGENT },
    });
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/xml');
    // Le particelle cambiano di rado: il catasto pubblica aggiornamenti ogni sei mesi
    res.setHeader('cache-control', 'public, s-maxage=86400, max-age=3600');
    res.send(await upstream.text());
  } catch {
    res.status(502).send('Catasto non raggiungibile');
  }
}
