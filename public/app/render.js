// Draw a resource as a table: one row per property, values folded into one cell.
// Blank nodes and resources described in the same document are nested inline;
// links to other documents can be expanded in place (fetched on demand).

import { DataFactory } from 'https://cdn.jsdelivr.net/npm/n3@1.17.4/+esm';
import { load } from './fetchrdf.js';
import { resolve, sameResource } from './resolve.js';
import { shorten, label, harvest, getLang, PREFIXES } from './labels.js';
import { graphToggle } from './graph.js';

const RDF_TYPE = PREFIXES.rdf + 'type';
const MD_ITEM = PREFIXES.md + 'item';
const FIRST_PROPS = [RDF_TYPE, PREFIXES.skos + 'prefLabel', PREFIXES.rdfs + 'label', 'http://schema.org/name'];
const FOLD_AFTER = 8; // show this many values, hide the rest behind a button
const MAX_DEPTH = 4;

export const settings = { autoExpand: 1 }; // levels of linked RailClass resources to open automatically

const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined) el.append(c);
  return el;
};

export function browseHref(uri) {
  return `?u=${encodeURIComponent(uri)}`;
}

// A link to browse a URI here, labelled when a label is known (filled in later otherwise).
function uriLink(uri) {
  const lab = label(uri);
  return h('span', { class: 'uri', 'data-uri': uri },
    h('a', { href: browseHref(uri), class: 'lab', title: uri }, lab || shorten(uri)),
    lab ? h('span', { class: 'short' }, ' ', shorten(uri)) : null,
  );
}

function literal(term) {
  const dt = term.datatype && term.datatype.value;
  const plain = !dt || dt === PREFIXES.xsd + 'string' || dt === PREFIXES.rdf + 'langString';
  return h('span', { class: 'lit' },
    /^https?:\/\/\S+$/.test(term.value) ? h('a', { href: term.value, rel: 'noopener', target: '_blank' }, term.value) : term.value,
    term.language ? h('span', { class: 'tag' }, '@' + term.language) : null,
    !plain ? h('span', { class: 'tag' }, '^^' + shorten(dt)) : null,
  );
}

// subject: an N3 term; store: the document it came from.
export function resourceTable(subject, store, ctx = { depth: 0, seen: new Set(), docUri: '' }) {
  const key = subject.termType + ':' + subject.value;
  const seen = new Set(ctx.seen).add(key);
  const quads = store.getQuads(subject, null, null, null);

  const byPred = new Map();
  for (const q of quads) {
    if (!byPred.has(q.predicate.value)) byPred.set(q.predicate.value, []);
    byPred.get(q.predicate.value).push(q.object);
  }
  const preds = [...byPred.keys()].sort((a, b) => {
    // Items a page embeds as microdata are context, not the resource's own description: put them last.
    if ((a === MD_ITEM) !== (b === MD_ITEM)) return a === MD_ITEM ? 1 : -1;
    const ia = FIRST_PROPS.indexOf(a), ib = FIRST_PROPS.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return shorten(a).localeCompare(shorten(b), undefined, { numeric: true });
  });

  const table = h('table', { class: 'res' });
  if (!quads.length) {
    table.append(h('tr', {}, h('td', { class: 'empty', colspan: 2 }, 'この文書には、この資源についての記述がありません。')));
  }
  for (const p of preds) {
    const values = byPred.get(p).sort((a, b) => langRank(a) - langRank(b));
    // Labels in dozens of languages (Wikidata): show the preferred ones, fold the rest.
    const preferred = values.filter((o) => langRank(o) < 3).length;
    const foldAfter = preferred && preferred < values.length && values.every((o) => o.termType === 'Literal') ? preferred : FOLD_AFTER;
    const cell = h('td', { class: 'vals' });
    values.forEach((o, i) => {
      const v = h('div', { class: 'val' + (i >= foldAfter ? ' folded' : '') }, valueNode(o, store, { ...ctx, seen }));
      cell.append(v);
    });
    if (values.length > foldAfter) {
      cell.append(h('button', {
        class: 'more',
        onclick: (e) => { cell.classList.add('open'); e.target.remove(); },
      }, `ほか ${values.length - foldAfter} 件`));
    }
    table.append(h('tr', {},
      h('th', {}, uriLink(p)),
      cell,
    ));
  }
  return table;
}

// 0: chosen language, 1: English, 2: no language tag or not a literal, 3: other languages.
function langRank(o) {
  const l = (o.termType === 'Literal' && o.language) || '';
  if (!l) return 2;
  if (l === getLang() || l.startsWith(getLang() + '-')) return 0;
  return l === 'en' || l.startsWith('en-') ? 1 : 3;
}

function valueNode(o, store, ctx) {
  if (o.termType === 'Literal') return literal(o);
  const key = o.termType + ':' + o.value;
  const describedHere = store.getQuads(o, null, null, null).length > 0;

  if (o.termType === 'BlankNode') {
    if (ctx.seen.has(key) || !describedHere) return h('span', { class: 'bnode' }, '_:' + o.value);
    return h('div', { class: 'nest' }, resourceTable(o, store, { ...ctx, depth: ctx.depth + 1 }));
  }

  // Named node.
  const wrap = h('div', { class: 'link' }, uriLink(o.value));
  if (ctx.seen.has(key) || ctx.depth + 1 >= MAX_DEPTH) return wrap;

  // Described in this same document (e.g. a #fragment): nest it right away.
  if (describedHere && !sameResource(o.value, ctx.docUri)) {
    wrap.append(h('div', { class: 'nest' }, resourceTable(o, store, { ...ctx, depth: ctx.depth + 1 })));
    return wrap;
  }

  const { dataset } = resolve(o.value);
  if (o.value.startsWith('http')) {
    const btn = h('button', { class: 'expand', title: 'ここで開く' }, '▸');
    btn.addEventListener('click', () => toggleExpand(wrap, btn, o, ctx));
    wrap.prepend(btn);
    if (dataset === 'railclass' && ctx.depth < settings.autoExpand && !isTypeLike(o.value)) toggleExpand(wrap, btn, o, ctx);
  }
  return wrap;
}

function isTypeLike(uri) {
  return /vocab(#|$)/.test(uri);
}

async function toggleExpand(wrap, btn, term, ctx) {
  const open = wrap.querySelector(':scope > .nest');
  if (open) { open.remove(); btn.textContent = '▸'; return; }
  btn.textContent = '…';
  const doc = await load(term.value);
  harvest(doc.store);
  btn.textContent = '▾';
  const box = h('div', { class: 'nest' });
  if (doc.error) box.append(errorBox(doc, { withUrl: true }));
  else {
    const subject = pickSubject(doc, term.value);
    box.append(resourceTable(subject, doc.store, { depth: ctx.depth + 1, seen: ctx.seen, docUri: doc.uri }));
    box.append(graphToggle(subject, doc.store, doc.uri));
  }
  wrap.append(box);
  refreshLabels(box);
  document.dispatchEvent(new CustomEvent('ldb:rendered', { detail: box }));
}

// Why a document could not be read: the reason in one line, what happened, what to try, and the record.
export function errorBox(doc, { withUrl = false } = {}) {
  const e = doc.error;
  const box = h('div', { class: 'errbox', role: 'alert' }, h('p', { class: 'errhead' }, e.title || e.message));
  if (e.why) box.append(h('p', { class: 'errwhy' }, e.why));
  if (e.hint) box.append(h('p', { class: 'errhint' }, e.hint));
  const facts = [...(withUrl ? [['取得先', doc.url]] : []), ...(e.facts || [])];
  if (facts.length) {
    const dl = h('dl');
    for (const [k, v] of facts) {
      const val = /^https?:\/\//.test(v) ? h('a', { href: v, target: '_blank', rel: 'noopener' }, v) : v;
      dl.append(h('dt', {}, k), h('dd', {}, val));
    }
    box.append(dl);
  }
  return box;
}

// The fetched document may name the resource slightly differently (http/https, wdt: vs entity).
export function pickSubject(doc, uri) {
  const candidates = [uri, doc.uri, uri.replace(/^http:/, 'https:'), uri.replace(/^https:/, 'http:')];
  const hit = candidates.find((c) => doc.store.countQuads(DataFactory.namedNode(c), null, null, null));
  return DataFactory.namedNode(hit || doc.uri);
}

// Re-draw link texts whose labels have become known.
export function refreshLabels(root = document) {
  for (const span of root.querySelectorAll('.uri[data-uri]')) {
    const uri = span.dataset.uri;
    const lab = label(uri);
    const a = span.querySelector('a.lab');
    if (lab && a.textContent !== lab) {
      a.textContent = lab;
      if (!span.querySelector('.short')) span.append(h('span', { class: 'short' }, ' ', shorten(uri)));
    }
  }
}
