// URI → where to fetch its RDF.
// A browser cannot rely on content negotiation everywhere (GitHub Pages has none),
// so known datasets get explicit rules. Anything else is fetched as-is with an Accept header.

// The site moved to its own domain; the GitHub Pages address now answers with a 301 that carries no CORS header.
const RAILCLASS_PAGES = 'https://railclass.ldas.jp';

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
  // DBpedia. Its https resource URIs redirect (303) to an http data address, which an https page cannot follow;
  // the https Turtle file is fetched directly instead (it allows cross-origin reads).
  {
    dataset: null,
    match: /^https?:\/\/dbpedia\.org\/(?:resource|page|data)\/([^#?]+?)(?:\.ttl|\.json|\.ntriples|\.rdf)?(?:#.*)?$/,
    url: (m) => `https://dbpedia.org/data/${m[1]}.ttl`,
    canonical: (m) => `http://dbpedia.org/resource/${m[1]}`,
  },
  // GeoNames. The place URI answers with a 303 that lacks the CORS header; the RDF file it points to has it.
  {
    dataset: null,
    match: /^https?:\/\/sws\.geonames\.org\/(\d+)\/?(?:about\.rdf)?(?:#.*)?$/,
    url: (m) => `https://sws.geonames.org/${m[1]}/about.rdf`,
    canonical: (m) => `https://sws.geonames.org/${m[1]}/`,
  },
  // VIAF. The http URI redirects to https without the CORS header, and asking for Turtle (our first choice)
  // gets a 403 page; the https URI with an RDF/XML Accept answers with the data and allows cross-origin reads.
  {
    dataset: null,
    match: /^https?:\/\/(?:www\.)?viaf\.org\/viaf\/(\d+)\/?(?:#.*)?$/,
    url: (m) => `https://viaf.org/viaf/${m[1]}`,
    canonical: (m) => `http://viaf.org/viaf/${m[1]}`,
    accept: 'application/rdf+xml',
  },
  // FOAF. Every term answers with a 303 to the HTML spec; the whole vocabulary is one RDF/XML file.
  // That file carries no CORS header, so it is read through the relay (xmlns.com is in RELAY_HOSTS).
  {
    dataset: null,
    match: /^https?:\/\/xmlns\.com\/foaf\/0\.1\/[^/#?]*(?:#.*)?$/,
    url: () => 'https://xmlns.com/foaf/spec/index.rdf',
  },
  // Social-experiment case database (sedb). The URIs keep the old project domain, which no longer answers;
  // the whole dataset (750 triples) is one Turtle file on the static site, so every URI maps to it.
  {
    dataset: 'sedb',
    match: /^https?:\/\/low-carbon\.k\.u-tokyo\.ac\.jp\/[^/#?]+$/,
    url: () => 'https://low-carbon-k.github.io/sedb/assets/rdf/data.ttl',
  },
  // Its vocabulary (se:) no longer answers either; the site now carries a description of it.
  {
    dataset: 'sedb',
    match: /^https?:\/\/www\.teitanso\.org\/2012\/04\/se(?:#.*)?$/,
    url: () => 'https://low-carbon-k.github.io/sedb/assets/rdf/vocab.ttl',
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

// The relay (relay/ in this repository, a Vercel Function) for sources that return RDF but do not allow
// cross-origin reads. Asked only after a direct fetch fails for lack of CORS, and only for these hosts
// (the same list as HOSTS in relay/api/fetch.js).
export const RELAY_URL = 'https://relay-eight-nu.vercel.app/api/fetch';
export const RELAY_HOSTS = ['id.ndl.go.jp', 'vocab.getty.edu', 'd-nb.info', 'xmlns.com'];
export function relayable(url) {
  try { return RELAY_HOSTS.includes(new URL(url).hostname); } catch { return false; }
}

export const ACCEPT = 'text/turtle, application/n-triples;q=0.9, application/ld+json;q=0.8, application/rdf+xml;q=0.5, */*;q=0.1';

export function resolve(uri) {
  for (const r of RULES) {
    const m = uri.match(r.match);
    if (m) return { uri: r.canonical ? r.canonical(m) : uri, url: r.url(m), dataset: r.dataset, accept: r.accept };
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

// A URI that is an image file rather than RDF (a Wikimedia Commons file path, a .jpg …).
export function isImageFile(uri) {
  return /^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/|\.(?:jpe?g|png|gif|svg|webp|avif|tiff?)(?:[?#]|$)/i.test(uri);
}

// Where to load an image value as a thumbnail, or null if it does not look like a web address.
// Old RailClass addresses move to the current site; Wikimedia Commons files are asked for at a small width
// (width 0: the original file).
export function imageUrl(value, width = 320) {
  if (!/^https?:\/\/\S+$/.test(value)) return null;
  let url = value.replace(/^https:\/\/nakamura196\.github\.io\/train-bodies\//, RAILCLASS_PAGES + '/');
  const commons = url.match(/^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/([^?#]+)/);
  if (commons) return `https://commons.wikimedia.org/wiki/Special:FilePath/${commons[1]}${width ? '?width=' + width : ''}`;
  const local = /^http:\/\/(?:localhost|127\.0\.0\.1)[:/]/.test(url);
  return local ? url : url.replace(/^http:/, 'https:');
}
