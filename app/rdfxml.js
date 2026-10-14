// RDF/XML → N3 quads, using the browser's own XML parser (no dependency).
// Covers the RDF/XML grammar used in practice: node and property elements, typed nodes,
// rdf:about / rdf:ID / rdf:nodeID / rdf:resource, property attributes, rdf:li,
// xml:base / xml:lang scoping, rdf:datatype, and parseType Resource / Literal / Collection.
// Not covered: reification via rdf:ID on property elements (the triple is kept, the reification is not).

import { DataFactory } from 'https://cdn.jsdelivr.net/npm/n3@1.17.4/+esm';

import { t } from './i18n.js';

const { namedNode, blankNode, literal, quad } = DataFactory;
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const XML = 'http://www.w3.org/XML/1998/namespace';
// rdf: names that are syntax, not properties, when they appear as attributes.
const SYNTAX_ATTRS = new Set(['about', 'ID', 'nodeID', 'resource', 'datatype', 'parseType', 'aboutEach', 'aboutEachPrefix', 'bagID']);

export function parseRdfXml(text, baseIRI) {
  const dom = new DOMParser().parseFromString(text, 'application/xml');
  const err = dom.getElementsByTagName('parsererror')[0];
  if (err) throw new Error(t('xmlParse') + err.textContent.trim().split('\n')[0]);

  const quads = [];
  const nodeIds = new Map(); // rdf:nodeID → blank node, so the same id is the same node
  const add = (s, p, o) => quads.push(quad(s, p, o));
  const bnode = (id) => {
    if (id == null) return blankNode();
    if (!nodeIds.has(id)) nodeIds.set(id, blankNode());
    return nodeIds.get(id);
  };

  const root = dom.documentElement;
  const top = { base: stripFragment(baseIRI), lang: '' };
  if (isRdf(root, 'RDF')) {
    const ctx = scope(root, top);
    for (const child of elements(root)) nodeElement(child, ctx);
  } else {
    nodeElement(root, top); // a single node element may stand in for rdf:RDF
  }
  return quads;

  // A node element describes one subject and returns it.
  function nodeElement(el, parent) {
    const c = scope(el, parent);
    const about = rdfAttr(el, 'about');
    const id = rdfAttr(el, 'ID');
    const nodeID = rdfAttr(el, 'nodeID');
    const subject = about != null ? namedNode(resolveIri(about, c.base))
      : id != null ? namedNode(c.base + '#' + id)
        : bnode(nodeID);

    if (!isRdf(el, 'Description')) add(subject, namedNode(RDF + 'type'), namedNode(iriOf(el)));
    propertyAttributes(el, subject, c);

    let li = 0;
    for (const child of elements(el)) {
      const pred = isRdf(child, 'li') ? RDF + '_' + (++li) : iriOf(child);
      propertyElement(child, subject, namedNode(pred), c);
    }
    return subject;
  }

  function propertyElement(el, subject, pred, parent) {
    const c = scope(el, parent);
    const parseType = rdfAttr(el, 'parseType');
    const kids = elements(el);

    if (parseType === 'Resource') {
      const o = blankNode();
      add(subject, pred, o);
      let li = 0;
      for (const child of kids) propertyElement(child, o, namedNode(isRdf(child, 'li') ? RDF + '_' + (++li) : iriOf(child)), c);
      return;
    }
    if (parseType === 'Collection') {
      const items = kids.map((k) => nodeElement(k, c));
      let head = namedNode(RDF + 'nil');
      for (let i = items.length - 1; i >= 0; i--) {
        const cell = blankNode();
        add(cell, namedNode(RDF + 'first'), items[i]);
        add(cell, namedNode(RDF + 'rest'), head);
        head = cell;
      }
      add(subject, pred, head);
      return;
    }
    if (parseType != null) { // "Literal" and any unknown value are XML literals by the spec
      const xml = [...el.childNodes].map((n) => new XMLSerializer().serializeToString(n)).join('');
      add(subject, pred, literal(xml, namedNode(RDF + 'XMLLiteral')));
      return;
    }
    if (kids.length) {
      add(subject, pred, nodeElement(kids[0], c));
      return;
    }

    const resource = rdfAttr(el, 'resource');
    const nodeID = rdfAttr(el, 'nodeID');
    const hasPropAttrs = [...el.attributes].some((a) => isPropertyAttr(a));
    if (resource != null || nodeID != null || hasPropAttrs) {
      // Empty property element: the object is a resource, possibly described by its attributes.
      const o = resource != null ? namedNode(resolveIri(resource, c.base)) : bnode(nodeID);
      add(subject, pred, o);
      propertyAttributes(el, o, c);
      return;
    }

    const datatype = rdfAttr(el, 'datatype');
    const text = el.textContent;
    add(subject, pred, datatype != null ? literal(text, namedNode(resolveIri(datatype, c.base)))
      : c.lang ? literal(text, c.lang) : literal(text));
  }

  function propertyAttributes(el, subject, c) {
    for (const a of el.attributes) {
      if (!isPropertyAttr(a)) continue;
      const iri = (a.namespaceURI || '') + a.localName;
      if (iri === RDF + 'type') add(subject, namedNode(iri), namedNode(resolveIri(a.value, c.base)));
      else add(subject, namedNode(iri), c.lang ? literal(a.value, c.lang) : literal(a.value));
    }
  }
}

function isPropertyAttr(a) {
  if (!a.namespaceURI) return false; // unqualified attributes are not properties
  if (a.namespaceURI === XML || a.namespaceURI === 'http://www.w3.org/2000/xmlns/') return false;
  if (a.namespaceURI === RDF && SYNTAX_ATTRS.has(a.localName)) return false;
  return true;
}

// xml:base and xml:lang are inherited by descendants.
function scope(el, parent) {
  const base = el.getAttributeNS(XML, 'base');
  const lang = el.getAttributeNS(XML, 'lang');
  return {
    base: base ? stripFragment(resolveIri(base, parent.base)) : parent.base,
    lang: el.hasAttributeNS(XML, 'lang') ? lang : parent.lang,
  };
}

function rdfAttr(el, name) {
  if (el.hasAttributeNS(RDF, name)) return el.getAttributeNS(RDF, name);
  return null;
}

function isRdf(el, local) {
  return el.namespaceURI === RDF && el.localName === local;
}

function iriOf(el) {
  return (el.namespaceURI || '') + el.localName;
}

function elements(el) {
  return [...el.childNodes].filter((n) => n.nodeType === 1);
}

function stripFragment(iri) {
  return iri.replace(/#.*$/, '');
}

// Absolute IRIs are kept as written (new URL() would add a trailing slash to "http://host").
function resolveIri(ref, base) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(ref)) return ref;
  if (ref === '') return base;
  if (ref.startsWith('#')) return base + ref;
  try { return new URL(ref, base).href; } catch { return ref; }
}
