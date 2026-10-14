import { DataFactory } from 'https://cdn.jsdelivr.net/npm/n3@1.17.4/+esm';
import { load } from './fetchrdf.js';
import { resolve, wikidataId, railclassClassUri } from './resolve.js';
import { harvest, fetchWikidataLabels, shorten, label } from './labels.js';
import { resourceTable, pickSubject, refreshLabels, browseHref, errorBox } from './render.js';
import { graphToggle } from './graph.js';
import { t } from './i18n.js';

const $ = (sel) => document.querySelector(sel);
const out = $('#out');
const form = $('#form');
const input = $('#u');

const homeTitle = 'LD Browser';
const MAX_LABEL_DOCS = 80; // RailClass documents fetched just to name links, per view
// Vocabularies read for property names, per dataset.
const DATASET_VOCAB = {
  railclass: 'https://nakamura196.github.io/train-bodies/vocab',
  sedb: 'http://www.teitanso.org/2012/04/se',
};

async function show(uri) {
  input.value = uri || '';
  out.replaceChildren();
  syncLangLink();
  // The top page holds both views: the intro without ?u=, the resource with it.
  document.documentElement.classList.toggle('viewing', !!uri);
  if (!uri) { document.title = homeTitle; return; }
  document.title = `${shorten(uri)} — LD Browser`;
  if (depth() > 0) {
    const back = el('button', { type: 'button', class: 'backbtn' }, t('back'));
    back.addEventListener('click', () => history.back());
    out.append(back);
  }

  const status = el('p', { class: 'status' }, t('loading'));
  out.append(status);
  const doc = await load(uri);
  status.remove();

  out.append(sourceLine(doc));
  if (doc.error) {
    out.append(errorBox(doc));
    return;
  }
  harvest(doc.store);
  const vocab = DATASET_VOCAB[doc.dataset];
  if (vocab) {
    const v = await load(vocab);
    if (!v.error) harvest(v.store);
  }

  const subject = pickSubject(doc, uri);
  out.append(await crossLinks(doc));
  if (!doc.store.countQuads(subject, null, null, null)) {
    out.append(el('p', { class: 'status' }, t('noSubject', doc.store.size)));
  }
  out.append(el('h2', {}, el('span', { class: 'uri', 'data-uri': subject.value }, el('a', { class: 'lab', href: subject.value, target: '_blank', rel: 'noopener' }, subject.value))));
  out.append(resourceTable(subject, doc.store, { depth: 0, seen: new Set(), docUri: doc.uri }));
  out.append(graphToggle(subject, doc.store, doc.uri));

  // Triples in the same document that point at this resource.
  const inbound = doc.store.getQuads(null, null, subject, null).filter((q) => !q.subject.equals(subject));
  if (inbound.length) {
    const list = el('ul', { class: 'inbound' });
    for (const q of inbound.slice(0, 200)) {
      list.append(el('li', {}, linkSpan(q.subject.value), ' ', el('span', { class: 'pred' }, label(q.predicate.value) || shorten(q.predicate.value)), t('inboundThis')));
    }
    out.append(el('h3', {}, t('inboundHead', inbound.length)), list);
  }

  // Other subjects in the document (e.g. sitelinks in Wikidata), folded.
  const others = doc.store.getSubjects(null, null, null)
    .filter((s) => !s.equals(subject) && s.termType === 'NamedNode' && !inbound.some((q) => q.subject.equals(s)));
  if (others.length) {
    const box = el('details', { class: 'others' }, el('summary', {}, t('others', others.length)));
    for (const s of others.slice(0, 100)) box.append(el('div', { class: 'other' }, linkSpan(s.value)));
    out.append(box);
  }

  // Blank nodes nothing points at (e.g. a page's embedded JSON-LD without @id): not reachable from the
  // subject, so show them as tables of their own.
  const loose = doc.store.getSubjects(null, null, null)
    .filter((s) => s.termType === 'BlankNode' && !doc.store.countQuads(null, null, s, null));
  if (loose.length) {
    out.append(el('h3', {}, t('loose', loose.length)));
    for (const s of loose.slice(0, 20)) {
      out.append(resourceTable(s, doc.store, { depth: 0, seen: new Set(), docUri: doc.uri }), graphToggle(s, doc.store, doc.uri));
    }
    if (loose.length > 20) out.append(el('p', { class: 'status' }, t('looseMore', loose.length - 20)));
  }

  await fillLabels(out);
}

// Wikidata does not link back to RailClass, so look for a RailClass class with the same Q id.
async function crossLinks(doc) {
  const qid = doc.dataset === 'wikidata' && wikidataId(doc.uri);
  if (!qid || !qid.startsWith('Q')) return '';
  const rc = await load(railclassClassUri(qid));
  if (rc.error || !rc.store.size) return '';
  harvest(rc.store);
  return el('p', { class: 'cross' }, t('crossRail'), linkSpan(railclassClassUri(qid)));
}

function sourceLine(doc) {
  const parts = [t('sourceLabel'), el('a', { href: doc.url, target: '_blank', rel: 'noopener' }, doc.url)];
  if (!doc.error) parts.push(t('sourceStats', doc.store.size, (doc.bytes / 1024).toFixed(1)));
  if (doc.url !== doc.uri.replace(/#.*$/, '')) parts.push(el('span', { class: 'note' }, t('rewritten')));
  if (doc.embedded?.quads.length) {
    const names = { jsonld: 'JSON-LD', microdata: 'microdata', rdfa: 'RDFa' };
    const got = Object.entries(doc.embedded.counts).filter(([, n]) => n).map(([k, n]) => `${names[k]} ${n}`).join(t('listSep'));
    parts.push(el('span', { class: 'note' }, t('embedded', got)));
  }
  return el('p', { class: 'source' }, ...parts);
}

// Name every link in root: Wikidata in batches, RailClass by reading its (small) documents.
async function fillLabels(root) {
  const uris = [...root.querySelectorAll('.uri[data-uri]')].map((s) => s.dataset.uri);
  const rail = [...new Set(uris.filter((u) => resolve(u).dataset === 'railclass').map((u) => resolve(u).url))].slice(0, MAX_LABEL_DOCS);
  await Promise.all([
    fetchWikidataLabels(uris).then(() => refreshLabels(root)),
    pool(rail, 6, async (url) => { harvest((await load(url)).store); }).then(() => refreshLabels(root)),
  ]);
}

async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (queue.length) await fn(queue.shift()); }));
}

function linkSpan(uri) {
  return el('span', { class: 'uri', 'data-uri': uri }, el('a', { class: 'lab', href: browseHref(uri), title: uri }, shorten(uri)));
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...children.filter((c) => c != null));
  return e;
}

// How many in-app views precede this one in this tab (0 for the first): the back button shows when > 0.
function depth() { return history.state?.depth || 0; }

// The language link keeps the current ?u= query.
function syncLangLink() {
  const a = $('#langlink');
  if (a) a.href = a.dataset.href + location.search;
}

// In-page navigation keeps the fetch cache alive.
function navigate(uri) {
  history.pushState({ uri, depth: depth() + 1 }, '', uri ? browseHref(uri) : location.pathname);
  show(uri);
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="?u="]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  navigate(new URLSearchParams(a.getAttribute('href').slice(1)).get('u'));
});
document.addEventListener('ldb:rendered', (e) => fillLabels(e.detail));
window.addEventListener('popstate', () => show(new URLSearchParams(location.search).get('u')));
form.addEventListener('submit', (e) => { e.preventDefault(); navigate(input.value.trim()); });

show(new URLSearchParams(location.search).get('u'));
