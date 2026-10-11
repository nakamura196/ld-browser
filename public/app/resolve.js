// URI → where to fetch its RDF.
// A browser cannot rely on content negotiation everywhere (GitHub Pages has none),
// so known datasets get explicit rules. Anything else is fetched as-is with an Accept header.

const RAILCLASS_PAGES = 'https://nakamura196.github.io/railclass';

// Each rule: test(uri) → { url, accept?, dataset } | null
const RULES = [
  // RailClass. The published RDF still uses the old GitHub Pages address (404 since the repo rename),
  // and w3id.org/railclass is pending. Both map to the Turtle files on the current site.
  {
    dataset: 'railclass',
    match: /^https:\/\/(?:nakamura196\.github\.io\/(?:train-bodies|railclass)|w3id\.org\/railclass)\/(?:rdf\/)?(class|model)\/([^#/?]+?)(?:\.ttl|\.jsonld|\.html)?(?:#.*)?$/,
    url: (m) => `${RAILCLASS_PAGES}/rdf/${m[1]}/${m[2]}.ttl`,
  },
  {
    dataset: 'railclass',
    match: /^https:\/\/(?:nakamura196\.github\.io\/(?:train-bodies|railclass)|w3id\.org\/railclass)\/(?:rdf\/)?vocab(?:\.ttl)?(?:#.*)?$/,
    url: () => `${RAILCLASS_PAGES}/rdf/vocab.ttl`,
  },
  // w3id short form for classes: https://w3id.org/railclass/Q1200438
  {
    dataset: 'railclass',
    match: /^https:\/\/w3id\.org\/railclass\/(Q\d+|[a-z][\w-]*)(?:#.*)?$/,
    url: (m) => `${RAILCLASS_PAGES}/rdf/class/${m[1]}.ttl`,
  },
  // Wikidata: entity, property-in-statement (wdt:/p:/ps: …) and page URLs all go to Special:EntityData.
  // flavor=simple keeps it small (truthy statements + labels), about 10 KB per item.
  {
    dataset: 'wikidata',
    match: /^https?:\/\/(?:www\.)?wikidata\.org\/(?:entity\/|wiki\/|prop\/(?:direct\/|statement\/|qualifier\/)?)?(?:Property:)?([QP]\d+)(?:[#?].*)?$/,
    url: (m) => `https://www.wikidata.org/wiki/Special:EntityData/${m[1]}.ttl?flavor=simple`,
    canonical: (m) => `http://www.wikidata.org/entity/${m[1]}`,
  },
  // Common vocabularies whose redirect chains drop the CORS header: point at the final file directly.
  {
    dataset: 'vocab',
    match: /^https?:\/\/purl\.org\/dc\/terms\/?[^/]*$/,
    url: () => 'https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl',
  },
  // SKOS: the 303 and 301 before the file carry no CORS header. The file itself is RDF/XML.
  {
    dataset: 'vocab',
    match: /^https?:\/\/www\.w3\.org\/2004\/02\/skos\/core(?:#.*)?$/,
    url: () => 'https://www.w3.org/2009/08/skos-reference/skos.rdf',
  },
];

export const ACCEPT = 'text/turtle, application/n-triples;q=0.9, application/ld+json;q=0.8, application/rdf+xml;q=0.5, */*;q=0.1';

export function resolve(uri) {
  for (const r of RULES) {
    const m = uri.match(r.match);
    if (m) return { uri: r.canonical ? r.canonical(m) : uri, url: r.url(m), dataset: r.dataset };
  }
  // Fetch over https: an http→https redirect usually lacks the CORS header,
  // and an https page may not load http at all (mixed content). Local servers stay on http.
  const local = /^http:\/\/(?:localhost|127\.0\.0\.1)[:/]/.test(uri);
  return { uri, url: uri.replace(/#.*$/, '').replace(local ? /^$/ : /^http:/, 'https:'), dataset: null };
}

// The RailClass class that mirrors a Wikidata item, under the URI the published data uses today.
export function railclassClassUri(qid) {
  return `https://nakamura196.github.io/train-bodies/rdf/class/${qid}`;
}

// The Wikidata Q/P id of a URI, or null.
export function wikidataId(uri) {
  const m = uri.match(/^https?:\/\/(?:www\.)?wikidata\.org\/(?:entity\/|prop\/(?:direct\/|statement\/|qualifier\/)?)([QP]\d+)$/);
  return m ? m[1] : null;
}

// Two URIs that resolve to the same document and canonical id are the same resource for display.
export function sameResource(a, b) {
  return resolve(a).uri === resolve(b).uri;
}
