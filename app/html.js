// RDF embedded in an HTML page, after Kanzaki's LD Browser (which extracted microdata):
// <script type="application/ld+json"> blocks, microdata (W3C "Microdata to RDF", simplified),
// and RDFa (the common core: vocab, prefix, about, typeof, property, rel, resource/href/src, content, datatype).
// Returns N3 quads and how many triples came from each kind.

import { DataFactory as F } from 'https://cdn.jsdelivr.net/npm/n3@1.17.4/+esm';

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const MD_ITEM = 'http://www.w3.org/ns/md#item';

export async function extractHtml(text, baseIRI, parseJsonLd) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const base = new URL(doc.querySelector('base[href]')?.getAttribute('href') || baseIRI, baseIRI).href;
  const counts = { jsonld: 0, microdata: 0, rdfa: 0 };
  const quads = [];
  const errors = [];

  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const got = await parseJsonLd(JSON.parse(s.textContent), base);
      quads.push(...got);
      counts.jsonld += got.length;
    } catch (e) {
      errors.push(`JSON-LD: ${e.message}`);
    }
  }
  const md = microdata(doc, base);
  quads.push(...md);
  counts.microdata = md.length;
  const ra = rdfa(doc, base);
  quads.push(...ra);
  counts.rdfa = ra.length;
  return { quads, counts, errors };
}

const abs = (u, base) => { try { return new URL(u, base).href; } catch { return null; } };
const isAbs = (u) => /^[a-z][a-z0-9+.-]*:/i.test(u);

// ---- microdata ----

function microdata(doc, base) {
  const out = [];
  const docNode = F.namedNode(base);
  const memo = new Map(); // element → subject (an item may be reached twice through itemref)
  const top = [...doc.querySelectorAll('[itemscope]')].filter((e) => !e.hasAttribute('itemprop'));
  for (const el of top) out.push(F.quad(docNode, F.namedNode(MD_ITEM), item(el, doc, base, out, memo, null)));
  return out;
}

function item(el, doc, base, out, memo, inheritedVocab) {
  if (memo.has(el)) return memo.get(el);
  const id = el.getAttribute('itemid');
  const subject = id && abs(id, base) ? F.namedNode(abs(id, base)) : F.blankNode();
  memo.set(el, subject);
  const types = (el.getAttribute('itemtype') || '').split(/\s+/).filter(Boolean).map((t) => abs(t, base)).filter(Boolean);
  for (const t of types) out.push(F.quad(subject, F.namedNode(RDF + 'type'), F.namedNode(t)));
  // Vocabulary for short property names: the type up to its last '/' or '#' (https://schema.org/Person → https://schema.org/).
  const vocab = types[0] ? types[0].replace(/[^/#]*$/, '') : inheritedVocab;

  for (const p of properties(el, doc)) {
    const value = propValue(p, doc, base, out, memo, vocab);
    for (const name of p.getAttribute('itemprop').split(/\s+/).filter(Boolean)) {
      const pred = isAbs(name) ? name : vocab ? vocab + name : `${base.replace(/#.*$/, '')}#${name}`;
      out.push(F.quad(subject, F.namedNode(pred), value));
    }
  }
  return subject;
}

// Elements carrying itemprop that belong to this item: its descendants (not inside a nested item) and itemref targets.
function properties(root, doc) {
  const found = [];
  const pending = [...root.children];
  for (const id of (root.getAttribute('itemref') || '').split(/\s+/).filter(Boolean)) {
    const t = doc.getElementById(id);
    if (t) pending.push(t);
  }
  const visited = new Set();
  while (pending.length) {
    const e = pending.shift();
    if (visited.has(e)) continue;
    visited.add(e);
    if (e.hasAttribute('itemprop')) found.push(e);
    if (!e.hasAttribute('itemscope')) pending.push(...e.children);
  }
  return found;
}

function propValue(el, doc, base, out, memo, vocab) {
  if (el.hasAttribute('itemscope')) return item(el, doc, base, out, memo, vocab);
  const tag = el.localName;
  const url = (attr) => {
    const u = abs(el.getAttribute(attr) || '', base);
    return u ? F.namedNode(u) : F.literal('');
  };
  if (tag === 'meta') return F.literal(el.getAttribute('content') || '');
  if (['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'].includes(tag)) return url('src');
  if (['a', 'area', 'link'].includes(tag)) return url('href');
  if (tag === 'object') return url('data');
  if (tag === 'data' || tag === 'meter') return F.literal(el.getAttribute('value') || '');
  if (tag === 'time' && el.hasAttribute('datetime')) return F.literal(el.getAttribute('datetime'));
  return F.literal(el.textContent.trim().replace(/\s+/g, ' '));
}

// ---- RDFa ----

// Part of the RDFa 1.1 initial context (https://www.w3.org/2011/rdfa-context/rdfa-1.1).
const INITIAL_PREFIXES = {
  rdf: RDF, rdfs: 'http://www.w3.org/2000/01/rdf-schema#', owl: 'http://www.w3.org/2002/07/owl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#', skos: 'http://www.w3.org/2004/02/skos/core#',
  dc: 'http://purl.org/dc/terms/', dcterms: 'http://purl.org/dc/terms/', dc11: 'http://purl.org/dc/elements/1.1/',
  foaf: 'http://xmlns.com/foaf/0.1/', schema: 'http://schema.org/', og: 'http://ogp.me/ns#',
  cc: 'http://creativecommons.org/ns#', prov: 'http://www.w3.org/ns/prov#', void: 'http://rdfs.org/ns/void#',
  dcat: 'http://www.w3.org/ns/dcat#', gr: 'http://purl.org/goodrelations/v1#', sioc: 'http://rdfs.org/sioc/ns#',
};

function rdfa(doc, base) {
  const out = [];
  const root = doc.documentElement;
  if (!doc.querySelector('[property],[typeof],[vocab],[about]')) return out;
  walk(root, { subject: F.namedNode(base), vocab: null, prefixes: { ...INITIAL_PREFIXES }, lang: root.getAttribute('lang') || '', pendingRel: null });
  return out;

  function expand(term, ctx, allowTerm) {
    if (!term) return null;
    if (term.startsWith('_:')) return F.blankNode(term.slice(2));
    const m = term.match(/^([A-Za-z_][\w.-]*)?:(.*)$/);
    if (m && !term.startsWith('//')) {
      const ns = ctx.prefixes[(m[1] || '').toLowerCase()];
      if (ns) return F.namedNode(ns + m[2]);
      if (isAbs(term)) return F.namedNode(term);
      return null;
    }
    if (allowTerm && ctx.vocab) return F.namedNode(ctx.vocab + term);
    return null; // a bare term without @vocab (e.g. rel="stylesheet") is not RDFa
  }
  function iri(v, ctx) {
    if (v == null) return null;
    const safe = v.match(/^\[(.*)\]$/);
    if (safe) return expand(safe[1], ctx, false);
    if (v.startsWith('_:')) return F.blankNode(v.slice(2));
    const u = abs(v, base);
    return u ? F.namedNode(u) : null;
  }
  function tokens(v) { return (v || '').split(/\s+/).filter(Boolean); }

  function walk(el, parent) {
    const ctx = { ...parent, prefixes: parent.prefixes };
    if (el.hasAttribute('vocab')) ctx.vocab = el.getAttribute('vocab') ? abs(el.getAttribute('vocab'), base) : null;
    if (el.hasAttribute('prefix')) {
      ctx.prefixes = { ...ctx.prefixes };
      const parts = tokens(el.getAttribute('prefix'));
      for (let i = 0; i + 1 < parts.length; i += 2) ctx.prefixes[parts[i].replace(/:$/, '').toLowerCase()] = parts[i + 1];
    }
    if (el.hasAttribute('lang')) ctx.lang = el.getAttribute('lang');

    const has = (a) => el.hasAttribute(a);
    const resource = iri(el.getAttribute('resource'), ctx) || iri(el.getAttribute('href'), ctx) || iri(el.getAttribute('src'), ctx);
    const props = tokens(el.getAttribute('property')).map((t) => expand(t, ctx, true)).filter(Boolean);
    const rels = tokens(el.getAttribute('rel')).map((t) => expand(t, ctx, true)).filter(Boolean);
    const types = tokens(el.getAttribute('typeof')).map((t) => expand(t, ctx, true)).filter(Boolean);
    const about = has('about') ? iri(el.getAttribute('about'), ctx) : null;

    let subject = ctx.subject;
    let newSubject = null; // what children describe
    let typed = null; // what typeof applies to

    if (about) subject = about;
    if (!props.length && !rels.length) {
      if (about) newSubject = about;
      else if (types.length) newSubject = resource || F.blankNode();
      else if (resource && has('resource')) newSubject = resource;
      typed = newSubject;
    } else if (types.length) {
      typed = about && !props.length ? about : (resource || F.blankNode());
      if (about && !props.length) newSubject = about;
    }

    // A rel waiting on the parent (rel without a resource) is completed by this element's new subject.
    if (parent.pendingRel && (newSubject || about)) {
      for (const p of parent.pendingRel.preds) out.push(F.quad(parent.pendingRel.subject, p, newSubject || about));
    }
    if (typed) for (const t of types) out.push(F.quad(typed, F.namedNode(RDF + 'type'), t));

    let pendingRel = null;
    if (rels.length) {
      const object = typed && !about ? typed : resource;
      if (object) for (const p of rels) out.push(F.quad(subject, p, object));
      else pendingRel = { subject, preds: rels };
      if (object && types.length) newSubject = object;
    }

    if (props.length) {
      let value;
      if (types.length && !about) value = typed;
      else if (has('content')) value = literal(el.getAttribute('content'), el, ctx);
      else if (!has('datatype') && resource && !rels.length) value = resource;
      else value = literal(el.getAttribute('datetime') ?? el.textContent.trim().replace(/\s+/g, ' '), el, ctx);
      for (const p of props) out.push(F.quad(subject, p, value));
      if (types.length && !about) newSubject = typed;
    }

    const next = {
      ...ctx,
      subject: newSubject || (about && !props.length ? about : ctx.subject),
      pendingRel: pendingRel || (newSubject || about ? null : parent.pendingRel),
    };
    // Literal values with markup inside are taken as text; their children are still walked for nested RDFa.
    for (const c of el.children) walk(c, next);
  }

  function literal(v, el, ctx) {
    const dt = el.getAttribute('datatype');
    if (dt) {
      const d = expand(dt, ctx, true);
      if (d) return F.literal(v, d);
    }
    return ctx.lang ? F.literal(v, ctx.lang) : F.literal(v);
  }
}
