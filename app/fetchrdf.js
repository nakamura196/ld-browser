// Fetch a URI's RDF (Turtle, N-Triples, JSON-LD, RDF/XML) in the browser and parse it into an N3 Store.
// One request per document; results are cached for the page's lifetime.

import { Parser, Store } from 'https://cdn.jsdelivr.net/npm/n3@1.17.4/+esm';
import { resolve, ACCEPT } from './resolve.js';
import { parseRdfXml } from './rdfxml.js';
import { extractHtml } from './html.js';
import { t } from './i18n.js';

const MAX_BYTES = 2 * 1024 * 1024; // larger documents (e.g. railclass all.ttl, 8 MB) are refused
const cache = new Map(); // fetch url → Promise<Doc>

// Doc: { uri, url, dataset, store, bytes, error? }
export function load(uri) {
  const r = resolve(uri);
  if (!cache.has(r.url)) cache.set(r.url, fetchDoc(r));
  return cache.get(r.url);
}

const TIMEOUT_MS = 20000;

// Why a document could not be read. title: one line; why: what happened; hint: what the reader can do;
// facts: [label, value] pairs for the record (status, content type, the parser's own words).
function fail(kind, title, why, hint, facts = []) {
  return { kind, message: title, title, why, hint, facts };
}

async function fetchDoc({ uri, url, dataset }) {
  const doc = { uri, url, dataset, store: new Store(), bytes: 0 };
  let parsed;
  try { parsed = new URL(url); } catch {
    doc.error = fail('uri', t('badUri'), t('badUriWhy'), t('badUriHint'));
    return doc;
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    doc.error = fail('scheme', t('schemeTitle', parsed.protocol), t('schemeWhy'), t('schemeHint'));
    return doc;
  }

  let res;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    res = await fetch(url, { headers: { Accept: ACCEPT }, signal: ctl.signal });
  } catch (e) {
    clearTimeout(timer);
    doc.error = await networkFailure(url, e);
    return doc;
  }
  clearTimeout(timer);
  const facts = [[t('factStatus'), `${res.status} ${res.statusText}`.trim()]];
  if (res.redirected && res.url && res.url !== url) facts.push([t('factRedirect'), res.url]);
  if (!res.ok) {
    doc.error = httpFailure(res.status, facts);
    return doc;
  }
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  facts.push([t('factType'), type || t('typeNone')]);
  const len = Number(res.headers.get('content-length') || 0);
  const tooBig = (n) => fail('size', t('tooBigTitle', (n / 1048576).toFixed(1)), t('tooBigWhy', MAX_BYTES / 1048576), t('tooBigHint'), facts);
  if (len > MAX_BYTES) { doc.error = tooBig(len); return doc; }
  const text = await res.text();
  doc.bytes = text.length;
  if (text.length > MAX_BYTES) { doc.error = tooBig(text.length); return doc; }
  doc.contentType = type;
  const format = sniff(type, text);
  try {
    await parseInto(doc, text, format, res.url || url);
  } catch (e) {
    if (e.ldb) e.ldb.facts = [...facts, ...e.ldb.facts];
    doc.error = e.ldb || parseFailure(e, format, type, text, facts);
    return doc;
  }
  if (!doc.store.size) {
    doc.error = fail('empty', t('emptyTitle'), t('emptyWhy', FORMAT_NAMES[format]), t('emptyHint'), facts);
  }
  return doc;
}

const FORMAT_NAMES = {
  jsonld: 'JSON-LD', rdfxml: 'RDF/XML', xml: 'RDF/XML', html: 'HTML', 'N-Triples': 'N-Triples', 'N-Quads': 'N-Quads', TriG: 'TriG', Turtle: 'Turtle',
};

// Decide the format from the content type, and from the first characters when the type says little
// (text/plain, application/octet-stream, or none: common for files served from plain web space).
function sniff(type, text) {
  if (type === 'application/ld+json' || type === 'application/json') return 'jsonld';
  if (type === 'application/rdf+xml') return 'rdfxml';
  if (type === 'text/html' || type === 'application/xhtml+xml') return 'html';
  const named = { 'application/n-triples': 'N-Triples', 'application/n-quads': 'N-Quads', 'application/trig': 'TriG', 'text/turtle': 'Turtle' }[type];
  if (named) return named;
  const head = text.slice(0, 2000).replace(/^\uFEFF/, '').trimStart();
  if (/^<!doctype html|^<html[\s>]/i.test(head)) return 'html';
  if (/^[{[]/.test(head)) return 'jsonld';
  if (/^<\?xml|^<rdf:RDF/.test(head)) return /<rdf:RDF|rdf-syntax-ns#/.test(text) ? 'rdfxml' : 'xml';
  return 'Turtle';
}

// fetch() hides why a request failed. Ask again in no-cors mode: if that gets an (opaque) answer,
// the server is there and only the permission is missing; if it fails too, the server was not reached.
async function networkFailure(url, e) {
  if (e.name === 'AbortError') {
    return fail('timeout', t('timeoutTitle', TIMEOUT_MS / 1000), t('timeoutWhy'), t('retryHint'));
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return fail('offline', t('offlineTitle'), t('offlineWhy'), t('offlineHint'));
  }
  let reached = false;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    await fetch(url, { mode: 'no-cors', signal: ctl.signal });
    clearTimeout(timer);
    reached = true;
  } catch { /* not reached either */ }
  if (reached) {
    return fail('cors', t('corsTitle'), t('corsWhy'), t('corsHint'));
  }
  return fail('network', t('networkTitle'), t('networkWhy'), t('networkHint'));
}

function httpFailure(status, facts) {
  const tf = (title, why, hint) => fail('http', title, why, hint, facts);
  if (status === 404) return tf(t('http404'), t('http404Why'), t('http404Hint'));
  if (status === 410) return tf(t('http410'), t('http410Why'), '');
  if (status === 401 || status === 403) return tf(t('http403', status), t('http403Why'), t('http403Hint'));
  if (status === 406) return tf(t('http406'), t('http406Why'), t('http406Hint'));
  if (status === 429) return tf(t('http429'), t('http429Why'), t('retryHint'));
  if (status >= 500) return tf(t('http5xx', status), t('http5xxWhy'), t('retryHint'));
  return tf(t('httpOther', status), t('httpOtherWhy'), '');
}

// Parsers report in English with a line number; say what was tried, and show the line it stopped at.
function parseFailure(e, format, type, text, facts) {
  const raw = String(e.message || e);
  if (format !== 'xml') facts.push([t('factParser'), raw.slice(0, 300)]);
  const m = raw.match(/line (\d+)/i) || (e.context && e.context.line ? [null, e.context.line] : null);
  if (m) {
    const n = Number(m[1]);
    const line = text.split(/\r?\n/)[n - 1];
    if (line !== undefined) facts.push([t('factLine', n), line.trim().slice(0, 160) || t('emptyLine')]);
  }
  const fmt = FORMAT_NAMES[format] || format;
  const guessed = !type || !/turtle|n-triples|n-quads|trig|ld\+json|json|rdf\+xml|html/.test(type);
  let why = t('parseWhy', fmt);
  let hint = m ? t('parseHintLine') : t('parseHint');
  if (format === 'xml') {
    why = t('xmlWhy');
    hint = t('xmlHint');
  } else if (guessed) {
    why = t('guessedWhy', type || t('guessedUnknown'), fmt);
    hint = t('guessedHint');
  } else if (format === 'jsonld' && /context/i.test(raw)) {
    why = t('ctxWhy');
    hint = t('ctxHint');
  } else if (format === 'jsonld' && e instanceof SyntaxError) {
    why = t('jsonWhy');
  }
  return fail('parse', t('parseTitle', fmt), why, hint, facts);
}

async function jsonLdQuads(json, baseIRI) {
  const { default: jsonld } = await import('https://cdn.jsdelivr.net/npm/jsonld@8.3.3/+esm');
  const nq = await jsonld.toRDF(json, { format: 'application/n-quads', base: baseIRI });
  return new Parser({ format: 'N-Quads' }).parse(nq);
}

async function parseInto(doc, text, format, baseIRI) {
  const store = doc.store;
  if (format === 'jsonld') {
    store.addQuads(await jsonLdQuads(JSON.parse(text), baseIRI));
    return;
  }
  if (format === 'rdfxml') {
    store.addQuads(parseRdfXml(text, baseIRI));
    return;
  }
  if (format === 'xml') throw new Error('not RDF/XML');
  if (format === 'html') {
    // No RDF version: take what the page embeds (JSON-LD, microdata, RDFa).
    const got = await extractHtml(text, baseIRI, jsonLdQuads);
    doc.embedded = got;
    if (!got.quads.length) {
      const err = new Error('no embedded RDF');
      err.ldb = fail('html', t('htmlTitle'), t('htmlWhy'), t('htmlHint'), got.errors.map((x) => [t('factParser'), x]));
      throw err;
    }
    store.addQuads(got.quads);
    return;
  }
  store.addQuads(new Parser({ format, baseIRI }).parse(text));
}
