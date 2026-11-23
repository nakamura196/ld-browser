// A small graph drawing per table, after Kanzaki's LD Browser: the triples a table shows,
// drawn as nodes and arrows, only when there are at most MAX_TRIPLES of them.
// No library: a force layout (Fruchterman–Reingold) and plain SVG.

import { sameResource } from './resolve.js';
import { t } from './i18n.js';
import { DataFactory as F } from 'https://cdn.jsdelivr.net/npm/n3@1.17.4/+esm';
import { shorten, label, langRank, foldAfter, propertyValues } from './labels.js';

const MAX_TRIPLES = 300;
const MAX_DEPTH = 4; // same as the table
const MIN_SCALE = 0.75; // screen px per drawing unit at first view (text 12 → 9 px)
const SVG = 'http://www.w3.org/2000/svg';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

// The triples the table for `subject` shows: its own, plus those of blank nodes and
// resources described in the same document, followed down to MAX_DEPTH.
// Values the table folds away (behind "N more") are left out, and not followed: a list of 617 parts
// is drawn as its first few. Literals in languages other than the chosen one and English are among them
// (Wikidata has dozens); they are counted apart.
export function collectTriples(subject, store, docUri) {
  const quads = [];
  let skipped = 0, folded = 0;
  const done = new Set();
  const walk = (s, depth) => {
    const key = s.termType + ':' + s.value;
    if (done.has(key) || depth >= MAX_DEPTH) return;
    done.add(key);
    const byPred = new Map();
    for (const q of store.getQuads(s, null, null, null)) {
      if (!byPred.has(q.predicate.value)) byPred.set(q.predicate.value, { p: q.predicate, objects: [] });
      byPred.get(q.predicate.value).objects.push(q.object);
    }
    for (const { p, objects } of byPred.values()) {
      // Lists are drawn as arrows straight to their items, without the chain of list nodes.
      const group = propertyValues(store, objects).map((v) => F.quad(s, p, v.term));
      const keep = foldAfter(group.map((q) => q.object));
      group.forEach((q, i) => {
        if (i >= keep) { if (otherLanguage(q.object)) skipped++; else folded++; return; }
        quads.push(q);
        const o = q.object;
        if (o.termType === 'Literal' || !store.countQuads(o, null, null, null)) return;
        if (o.termType === 'BlankNode' || !sameResource(o.value, docUri)) walk(o, depth + 1);
      });
    }
  };
  walk(subject, 0);
  return { quads, skipped, folded };
}

function otherLanguage(o) {
  return langRank(o) === 3;
}

// A button that opens the drawing under the table, or a note saying why there is none.
export function graphToggle(subject, store, docUri) {
  const all = collectTriples(subject, store, docUri);
  const { skipped, folded } = all;
  let quads = all.quads, literals = 0;
  const bar = document.createElement('div');
  bar.className = 'graphbar';
  if (!quads.length) return bar;
  // Too many to draw (Wikidata: hundreds of identifiers and dates): keep the links between resources,
  // which is what a drawing shows better than the table, and leave the text values to the table.
  if (quads.length > MAX_TRIPLES) {
    const links = quads.filter((q) => q.object.termType !== 'Literal');
    literals = quads.length - links.length;
    quads = links;
  }
  if (quads.length > MAX_TRIPLES || !quads.length) {
    bar.append(note(t('graphTooBig', MAX_TRIPLES, all.quads.length)));
    return bar;
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'graphbtn';
  btn.textContent = t('graphBtn', quads.length);
  let box = null;
  btn.addEventListener('click', () => {
    if (box) { box.remove(); box = null; btn.setAttribute('aria-expanded', 'false'); return; }
    box = drawGraph(subject, quads);
    if (skipped) box.append(note(t('graphSkipped', skipped)));
    if (folded) box.append(note(t('graphFolded', folded)));
    if (literals) box.append(note(t('graphLiterals', literals, MAX_TRIPLES)));
    bar.append(box);
    box.initView();
    btn.setAttribute('aria-expanded', 'true');
  });
  btn.setAttribute('aria-expanded', 'false');
  bar.append(btn);
  return bar;
}

function note(text) {
  const p = document.createElement('p');
  p.className = 'status';
  p.textContent = text;
  return p;
}

// ---- nodes and edges ----

function buildGraph(subject, quads) {
  const nodes = new Map();
  const edges = [];
  const nodeFor = (term, ownIndex) => {
    // Each literal and each rdf:type target gets its own node (a shared class node pulls every
    // subject into one knot); otherwise the same URI or blank node is one node.
    const key = ownIndex !== undefined ? 'L' + ownIndex : term.termType + ':' + term.value;
    if (!nodes.has(key)) nodes.set(key, makeNode(key, term));
    return nodes.get(key);
  };
  const root = nodeFor(subject);
  root.root = true;
  quads.forEach((q, i) => {
    const own = q.object.termType === 'Literal' || (q.predicate.value === RDF_TYPE && !q.object.equals(subject));
    const s = nodeFor(q.subject), o = nodeFor(q.object, own ? i : undefined);
    edges.push({ s, o, pred: q.predicate.value });
  });
  return { root, nodes: [...nodes.values()], edges };
}

function makeNode(key, term) {
  let text, full = term.value;
  if (term.termType === 'Literal') {
    text = term.value + (term.language ? ` @${term.language}` : '');
  } else if (term.termType === 'BlankNode') {
    text = '';
    full = '_:' + term.value;
  } else {
    text = label(term.value) || shorten(term.value);
  }
  text = clip(text.replace(/\s+/g, ' '), term.termType === 'Literal' ? 28 : 24);
  const w = term.termType === 'BlankNode' ? 18 : Math.max(24, textWidth(text) + 16);
  return { key, term, text, full, w, h: 22, x: 0, y: 0 };
}

function clip(s, n) {
  return [...s].length > n ? [...s].slice(0, n - 1).join('') + '…' : s;
}

// Rough width at 12px: full-width characters about 12px, others about 6.6px.
function textWidth(s) {
  let w = 0;
  for (const ch of s) w += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 12 : 6.6;
  return w;
}

// ---- layout ----

function layout({ root, nodes, edges }) {
  // Start from rings by distance from the root, so the result is the same every time.
  const adj = new Map(nodes.map((n) => [n, []]));
  for (const e of edges) { adj.get(e.s).push(e.o); adj.get(e.o).push(e.s); }
  const level = new Map([[root, 0]]);
  const queue = [root];
  while (queue.length) {
    const n = queue.shift();
    for (const m of adj.get(n)) if (!level.has(m)) { level.set(m, level.get(n) + 1); queue.push(m); }
  }
  const rings = new Map();
  for (const n of nodes) {
    const l = level.get(n) ?? 1;
    if (!rings.has(l)) rings.set(l, []);
    rings.get(l).push(n);
  }
  for (const [l, ring] of rings) {
    ring.forEach((n, i) => {
      const a = (2 * Math.PI * i) / ring.length + l * 0.5;
      n.x = Math.cos(a) * l * 160;
      n.y = Math.sin(a) * l * 160;
    });
  }

  // Deduplicate undirected pairs so parallel or bidirectional edges do not pull two nodes on top of each other.
  const pairMap = new Map();
  for (const e of edges) {
    if (e.s === e.o) continue;
    const pk = e.s.key < e.o.key ? `${e.s.key}\0${e.o.key}` : `${e.o.key}\0${e.s.key}`;
    const p = pairMap.get(pk);
    if (p) p.count++;
    else pairMap.set(pk, { a: e.s, b: e.o, count: 1 });
  }
  const pairs = [...pairMap.values()];

  const k = 80; // ideal edge length
  const reach = 4 * k; // nodes further apart than this do not push each other
  const iterations = 300;
  for (let it = 0; it < iterations; it++) {
    const t = 40 * (1 - it / iterations) + 1;
    for (const n of nodes) { n.dx = 0; n.dy = 0; }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;
        // Distance between box edges rather than centres, so wide labels push harder.
        const d = Math.max(1, Math.hypot(dx, dy) - (a.w + b.w) / 4);
        if (!dx && !dy) { dx = 0.1 * (i - j); dy = 0.1; }
        const len = Math.hypot(dx, dy);
        const f = (k * k) / d;
        a.dx += (dx / len) * f; a.dy += (dy / len) * f;
        b.dx -= (dx / len) * f; b.dy -= (dy / len) * f;
      }
    }
    for (const { a, b, count } of pairs) {
      const dx = a.x - b.x, dy = a.y - b.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ideal = k + (count > 1 ? 110 : 0);
      const f = (len * len) / ideal;
      a.dx -= (dx / len) * f; a.dy -= (dy / len) * f;
      b.dx += (dx / len) * f; b.dy += (dy / len) * f;
    }
    for (const n of nodes) {
      if (n.root) continue;
      const len = Math.hypot(n.dx, n.dy) || 1;
      const step = Math.min(len, t);
      n.x += (n.dx / len) * step;
      n.y += (n.dy / len) * step;
    }
  }
}

// ---- drawing ----

function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

export function drawGraph(subject, quads) {
  const g = buildGraph(subject, quads);
  layout(g);

  const box = document.createElement('div');
  box.className = 'graph';
  const root = svg('svg', { role: 'img', 'aria-label': t('graphAria', quads.length) });
  const defs = svg('defs', {}, svg('marker', {
    id: 'ldb-arrow', viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse',
  }, svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' })));
  const scene = svg('g');
  root.append(defs, scene);

  // Group edges between the same pair of nodes (either direction) so parallel / bidirectional edges
  // curve apart instead of overlapping on a single straight line.
  const groups = new Map();
  for (const e of g.edges) {
    const [a, b] = e.s.key < e.o.key ? [e.s, e.o] : [e.o, e.s];
    const pk = `${a.key}\0${b.key}`;
    if (!groups.has(pk)) groups.set(pk, { a, b, list: [] });
    groups.get(pk).list.push(e);
  }
  const edgeMeta = new Map();
  for (const { a, b, list } of groups.values()) {
    // Keep same-direction edges together so opposite directions bow to opposite sides.
    list.sort((x, y) => (x.s === a ? 0 : 1) - (y.s === a ? 0 : 1));
    const n = list.length;
    list.forEach((e, idx) => {
      edgeMeta.set(e, { a, b, offset: n > 1 ? (idx - (n - 1) / 2) * 38 : 0 });
    });
  }

  // Edge paths first so nodes sit on top, then edge labels last so labels stay readable.
  const edgeEls = g.edges.map((e) => {
    const path = svg('path', { class: 'edge', 'marker-end': 'url(#ldb-arrow)' });
    const text = svg('text', { class: 'elabel' }, clip(label(e.pred) || shorten(e.pred), 24));
    text.append(svg('title', {}, e.pred));
    scene.append(path);
    return { e, path, text, meta: edgeMeta.get(e) };
  });
  const nodeEls = new Map();
  for (const n of g.nodes) {
    const kind = n.term.termType === 'Literal' ? 'lit' : n.term.termType === 'BlankNode' ? 'bn' : 'res';
    const grp = svg('g', { class: `node ${kind}${n.root ? ' root' : ''}` });
    grp.append(svg('title', {}, n.full));
    grp.append(svg('rect', {
      x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h,
      rx: kind === 'lit' ? 2 : n.h / 2,
    }));
    if (n.text) grp.append(svg('text', { 'text-anchor': 'middle', dy: '0.35em' }, n.text));
    let el = grp;
    if (kind === 'res' && !n.root && /^https?:/.test(n.term.value)) {
      el = svg('a', { href: `?u=${encodeURIComponent(n.term.value)}` }, grp);
    }
    scene.append(el);
    nodeEls.set(n, grp);
  }
  for (const { text } of edgeEls) scene.append(text);

  const place = () => {
    for (const [n, grp] of nodeEls) grp.setAttribute('transform', `translate(${n.x},${n.y})`);
    for (const { e, path, text, meta } of edgeEls) {
      if (meta.offset === 0 || e.s === e.o) {
        const [x1, y1] = boxEdge(e.s, e.o.x, e.o.y);
        const [x2, y2] = boxEdge(e.o, e.s.x, e.s.y);
        path.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
        text.setAttribute('x', (x1 + x2) / 2);
        text.setAttribute('y', (y1 + y2) / 2 - 3);
      } else {
        const { a, b, offset } = meta;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist, ny = dx / dist;
        const cx = (a.x + b.x) / 2 + nx * offset * 2;
        const cy = (a.y + b.y) / 2 + ny * offset * 2;
        const [x1, y1] = boxEdge(e.s, cx, cy);
        const [x2, y2] = boxEdge(e.o, cx, cy);
        path.setAttribute('d', `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`);
        const side = Math.sign(offset) * 10;
        text.setAttribute('x', 0.25 * x1 + 0.5 * cx + 0.25 * x2 + nx * side);
        text.setAttribute('y', 0.25 * y1 + 0.5 * cy + 0.25 * y2 + ny * side - 2);
      }
    }
  };
  place();

  // View: fit everything, then pan by dragging the background, zoom with the buttons
  // or with pinch / Ctrl + wheel (plain wheel keeps scrolling the page).
  const bounds = () => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of g.nodes) {
      x0 = Math.min(x0, n.x - n.w / 2); x1 = Math.max(x1, n.x + n.w / 2);
      y0 = Math.min(y0, n.y - n.h / 2); y1 = Math.max(y1, n.y + n.h / 2);
    }
    return { x: x0 - 30, y: y0 - 30, w: x1 - x0 + 60, h: y1 - y0 + 60 };
  };
  let view = bounds();
  const setView = () => root.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  setView();
  const zoom = (f, cx = view.x + view.w / 2, cy = view.y + view.h / 2) => {
    view = { x: cx - (cx - view.x) * f, y: cy - (cy - view.y) * f, w: view.w * f, h: view.h * f };
    setView();
  };
  const toSvg = (ev) => {
    const p = root.createSVGPoint();
    p.x = ev.clientX; p.y = ev.clientY;
    return p.matrixTransform(scene.getScreenCTM().inverse());
  };
  root.addEventListener('wheel', (ev) => {
    if (!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault();
    const p = toSvg(ev);
    zoom(Math.exp(ev.deltaY * 0.01), p.x, p.y);
  }, { passive: false });

  let drag = null;
  root.addEventListener('pointerdown', (ev) => {
    const grp = ev.target.closest('.node');
    const n = grp && [...nodeEls].find(([, el]) => el === grp)?.[0];
    const p = toSvg(ev);
    drag = { n, p, moved: false };
  });
  root.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = toSvg(ev);
    const dx = p.x - drag.p.x, dy = p.y - drag.p.y;
    // Capture only once it is a drag: capturing on press would send the click to the svg, not the link.
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; root.setPointerCapture(ev.pointerId); }
    if (!drag.moved) return;
    if (drag.n) {
      drag.n.x += dx; drag.n.y += dy; drag.p = p;
      place();
    } else {
      // Keep the grabbed point under the pointer (drag.p stays fixed while panning).
      view = { ...view, x: view.x - dx, y: view.y - dy };
      setView();
    }
  });
  const end = (ev) => {
    if (drag?.moved) {
      // A drag is not a click: keep the link from opening.
      root.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }, { capture: true, once: true });
    }
    drag = null;
    if (root.hasPointerCapture(ev.pointerId)) root.releasePointerCapture(ev.pointerId);
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);

  const tools = document.createElement('div');
  tools.className = 'graphtools';
  const tool = (text, title, fn) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = text; b.title = title;
    b.addEventListener('click', fn);
    tools.append(b);
  };
  tool('＋', t('zoomIn'), () => zoom(0.8));
  tool('−', t('zoomOut'), () => zoom(1.25));
  tool(t('fitLabel'), t('fitTitle'), () => { view = bounds(); setView(); });
  tool('SVG', t('saveSvg'), () => saveSvg(root));
  const hint = document.createElement('span');
  hint.className = 'status';
  hint.textContent = t('graphHint');
  tools.append(hint);

  box.append(tools, root);
  // Once on the page: fit everything, unless that makes the text too small to read;
  // then start around the subject at a readable size ("Fit" still shows everything).
  box.initView = () => {
    const px = root.clientWidth || 800, py = root.clientHeight || 500;
    const all = bounds();
    const scale = Math.min(px / all.w, py / all.h);
    if (scale >= MIN_SCALE) return;
    const w = px / MIN_SCALE, h = py / MIN_SCALE;
    view = { x: g.root.x - w / 2, y: g.root.y - h / 2, w, h };
    setView();
  };
  return box;
}

function boxEdge(n, tx, ty) {
  // Where the line from n's centre towards (tx, ty) leaves n's box.
  const dx = tx - n.x, dy = ty - n.y;
  if (!dx && !dy) return [n.x, n.y];
  const sx = dx ? (n.w / 2) / Math.abs(dx) : Infinity;
  const sy = dy ? (n.h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy, 1);
  return [n.x + dx * s, n.y + dy * s];
}

function saveSvg(root) {
  // Inline the current colours so the file looks the same outside the page.
  const copy = root.cloneNode(true);
  copy.setAttribute('xmlns', SVG);
  const css = getComputedStyle(root);
  const style = document.createElementNS(SVG, 'style');
  style.textContent = [...document.styleSheets].flatMap((s) => {
    try { return [...s.cssRules].map((r) => r.cssText).filter((t) => t.startsWith('.graph svg')).map((t) => t.replace(/^\.graph svg\s*/, '')); } catch { return []; }
  }).join('\n').replace(/var\((--[\w-]+)\)/g, (_, v) => css.getPropertyValue(v).trim());
  copy.prepend(style);
  const url = URL.createObjectURL(new Blob([copy.outerHTML], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'graph.svg';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
