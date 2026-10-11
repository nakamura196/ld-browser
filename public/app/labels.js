// Human-readable names for URIs: from documents already loaded, from Wikidata in batches,
// and short prefixed names as the fallback.

import { wikidataId } from './resolve.js';

export const PREFIXES = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  dcterms: 'http://purl.org/dc/terms/',
  dc: 'http://purl.org/dc/elements/1.1/',
  foaf: 'http://xmlns.com/foaf/0.1/',
  schema: 'http://schema.org/',
  prov: 'http://www.w3.org/ns/prov#',
  md: 'http://www.w3.org/ns/md#',
  og: 'http://ogp.me/ns#',
  geo: 'http://www.opengis.net/ont/geosparql#',
  wd: 'http://www.wikidata.org/entity/',
  wdt: 'http://www.wikidata.org/prop/direct/',
  wikibase: 'http://wikiba.se/ontology#',
  // RailClass: old address is what the published data uses today; w3id is the future one.
  tb: 'https://nakamura196.github.io/train-bodies/vocab#',
  cls: 'https://nakamura196.github.io/train-bodies/rdf/class/',
  mdl: 'https://nakamura196.github.io/train-bodies/rdf/model/',
  rc: 'https://w3id.org/railclass/',
};

export function shorten(uri) {
  if (uri === 'https://schema.org/' || uri.startsWith('https://schema.org/')) uri = uri.replace('https:', 'http:');
  let best = null;
  for (const [p, ns] of Object.entries(PREFIXES)) {
    if (uri.startsWith(ns) && (!best || ns.length > best[1].length)) best = [p, ns];
  }
  return best ? `${best[0]}:${uri.slice(best[1].length)}` : uri;
}

const LABEL_PREDICATES = [
  PREFIXES.skos + 'prefLabel',
  PREFIXES.rdfs + 'label',
  'http://schema.org/name',
  'https://schema.org/name',
  PREFIXES.foaf + 'name',
  PREFIXES.dcterms + 'title',
];

let lang = 'ja';
export function setLang(l) { lang = l; }
export function getLang() { return lang; }

// Pick the literal in the preferred language, then English, then no tag, then anything.
export function pickLiteral(literals) {
  if (!literals.length) return null;
  const order = [lang, 'en', ''];
  for (const l of order) {
    const hit = literals.find((o) => (o.language || '') === l || (o.language || '').startsWith(l + '-'));
    if (hit) return hit;
  }
  return literals[0];
}

// Remember every label in a store, per language, so later lookups need no fetch.
const storeLabels = new Map(); // uri → literal terms (all languages)

export function harvest(store) {
  const byUri = new Map();
  for (const p of LABEL_PREDICATES) {
    for (const q of store.getQuads(null, p, null, null)) {
      if (q.object.termType !== 'Literal' || q.subject.termType !== 'NamedNode') continue;
      if (!byUri.has(q.subject.value)) byUri.set(q.subject.value, []);
      byUri.get(q.subject.value).push(q.object);
    }
  }
  for (const [uri, lits] of byUri) storeLabels.set(uri, lits);
}

export function label(uri) {
  const lits = storeLabels.get(uri) || storeLabels.get(wdEntity(uri));
  return lits ? pickLiteral(lits).value : null;
}

function wdEntity(uri) {
  const id = wikidataId(uri);
  return id ? `http://www.wikidata.org/entity/${id}` : null;
}

// Fetch Wikidata labels for many URIs at once (50 ids per request).
export async function fetchWikidataLabels(uris) {
  const ids = [...new Set(uris.map(wikidataId).filter(Boolean))]
    .filter((id) => !storeLabels.has(`http://www.wikidata.org/entity/${id}`));
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&props=labels&format=json&origin=*'
      + `&languages=ja|en&ids=${chunk.join('|')}`;
    try {
      const data = await (await fetch(url)).json();
      for (const [id, ent] of Object.entries(data.entities || {})) {
        const lits = Object.values(ent.labels || {}).map((l) => ({ value: l.value, language: l.language }));
        if (lits.length) storeLabels.set(`http://www.wikidata.org/entity/${id}`, lits);
      }
    } catch { /* labels are a nicety; the table still shows ids */ }
  }
}
