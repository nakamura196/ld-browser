// Fetch a URI's RDF (Turtle, N-Triples, JSON-LD, RDF/XML) in the browser and parse it into an N3 Store.
// One request per document; results are cached for the page's lifetime.

import { Parser, Store } from 'https://cdn.jsdelivr.net/npm/n3@1.17.4/+esm';
import { resolve, ACCEPT } from './resolve.js';
import { parseRdfXml } from './rdfxml.js';
import { extractHtml } from './html.js';

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
    doc.error = fail('uri', 'URI の形が正しくありません',
      '「https://」などで始まる、完全な URI ではないようです。', '前後の空白や、途中で切れていないかを確かめてください。');
    return doc;
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    doc.error = fail('scheme', `「${parsed.protocol}」の URI は取りに行けません`,
      'この URI は名前として使われているもので、ウェブ上の置き場所を指していません（urn: や mailto: など）。',
      'この資源を説明している別の文書（http(s) の URI）があれば、そちらを開いてください。');
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
  const facts = [['HTTP の状態', `${res.status} ${res.statusText}`.trim()]];
  if (res.redirected && res.url && res.url !== url) facts.push(['転送後の取得先', res.url]);
  if (!res.ok) {
    doc.error = httpFailure(res.status, facts);
    return doc;
  }
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  facts.push(['形式（Content-Type）', type || '（返ってきませんでした）']);
  const len = Number(res.headers.get('content-length') || 0);
  const tooBig = (n) => fail('size', `大きすぎるため読みません（${(n / 1048576).toFixed(1)} MB）`,
    `この道具は、ブラウザが固まらないよう ${MAX_BYTES / 1048576} MB までの文書だけを読みます。`,
    '資源ごとに分かれた小さな文書があれば、そちらを開いてください。', facts);
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
    doc.error = fail('empty', '読めましたが、中身が空でした',
      `${FORMAT_NAMES[format]} として最後まで読めましたが、トリプルが 1 つもありませんでした。`,
      '取得先を直接開いて、中身を確かめてください。', facts);
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
    return fail('timeout', `${TIMEOUT_MS / 1000} 秒待っても返事がありませんでした`,
      '相手のサーバが混んでいるか、止まっているようです。', '時間をおいて、もう一度開いてください。');
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return fail('offline', 'インターネットにつながっていません', 'この端末がオフラインです。', 'つながってから、もう一度開いてください。');
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
    return fail('cors', '相手のサーバが、別のサイトからの読み込みを許可していません（CORS）',
      'サーバには届きましたが、返事に「ほかのサイトの頁から読んでよい」という許可（Access-Control-Allow-Origin）が付いていませんでした。'
      + '転送（リダイレクト）の途中の 1 段にだけ許可が無い場合も、こうなります。ブラウザだけで動くこの道具では読めません。',
      '取得先を直接開けば中身は見られます。公開している側には、転送を含むすべての応答に許可を付けるよう頼むことができます。');
  }
  return fail('network', 'サーバにつながりませんでした',
    'ドメイン名が見つからない、証明書が正しくない、サーバが止まっている、のいずれかのようです。'
    + 'http でしか公開していないサーバも、ここでは https で取りに行くため、つながりません。',
    'URI の綴りを確かめてください。取得先をブラウザで直接開くと、原因が表示されることがあります。');
}

function httpFailure(status, facts) {
  const t = (title, why, hint) => fail('http', title, why, hint, facts);
  if (status === 404) return t('文書が見つかりません（HTTP 404）', 'この取得先には、何も置かれていません。',
    'URI の綴りを確かめてください。データの置き場所が変わった可能性もあります。');
  if (status === 410) return t('文書は削除されています（HTTP 410）', '公開側が、この文書を取り下げたと答えています。', '');
  if (status === 401 || status === 403) return t(`読む権限がありません（HTTP ${status}）`,
    'ログインが必要か、公開側が読み込みを拒んでいます。', 'ブラウザで直接開けるかを確かめてください。');
  if (status === 406) return t('求めた形式では返せない、と言われました（HTTP 406）',
    'この道具は Turtle・JSON-LD・RDF/XML などを求めますが、相手はそのどれも返せないようです。', 'RDF を公開していない URI の可能性があります。');
  if (status === 429) return t('短い間に読み込みすぎました（HTTP 429）', '相手のサーバが、しばらく待つよう求めています。', '時間をおいて、もう一度開いてください。');
  if (status >= 500) return t(`相手のサーバで障害が起きています（HTTP ${status}）`, 'こちらではなく、公開側の問題です。', '時間をおいて、もう一度開いてください。');
  return t(`読み込みに失敗しました（HTTP ${status}）`, '相手のサーバが、正常な応答を返しませんでした。', '');
}

// Parsers report in English with a line number; say what was tried, and show the line it stopped at.
function parseFailure(e, format, type, text, facts) {
  const raw = String(e.message || e);
  if (format !== 'xml') facts.push(['読み手の言葉', raw.slice(0, 300)]);
  const m = raw.match(/line (\d+)/i) || (e.context && e.context.line ? [null, e.context.line] : null);
  if (m) {
    const n = Number(m[1]);
    const line = text.split(/\r?\n/)[n - 1];
    if (line !== undefined) facts.push([`${n} 行目`, line.trim().slice(0, 160) || '（空行）']);
  }
  const fmt = FORMAT_NAMES[format] || format;
  const guessed = !type || !/turtle|n-triples|n-quads|trig|ld\+json|json|rdf\+xml|html/.test(type);
  let why = `${fmt} として読もうとしましたが、途中で書き方の誤りに行き当たりました。`;
  let hint = m ? '取得先を直接開き、上の行のあたりを確かめてください。' : '取得先を直接開いて、中身を確かめてください。';
  if (format === 'xml') {
    why = 'XML が返りましたが、RDF/XML ではありませんでした。';
    hint = 'RDF ではない XML（目録の書式など）の可能性があります。';
  } else if (guessed) {
    why = `相手は形式を「${type || '不明'}」と答えたため、${fmt} だと推し量って読もうとしましたが、読めませんでした。`;
    hint = 'RDF ではない文書が返ってきた可能性があります。取得先を直接開いて、中身を確かめてください。';
  } else if (format === 'jsonld' && /context/i.test(raw)) {
    why = 'JSON-LD の中で使われている @context（語の対応表）を、取りに行けませんでした。';
    hint = '@context の置き場所が、別のサイトからの読み込みを許可していない可能性があります。';
  } else if (format === 'jsonld' && e instanceof SyntaxError) {
    why = 'JSON として正しく書かれていませんでした（括弧や引用符の閉じ忘れなど）。';
  }
  return fail('parse', `${fmt} として読めませんでした`, why, hint, facts);
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
      err.ldb = fail('html', 'RDF ではなく、HTML の頁が返りました',
        '頁の中にも、埋め込まれた RDF（JSON-LD・microdata・RDFa）はありませんでした。',
        '人が読むための頁だけを公開している URI のようです。頁の中に「RDF」「Turtle」「JSON-LD」などの別の版へのリンクがあれば、そちらを開いてください。',
        got.errors.map((x) => ['読み手の言葉', x]));
      throw err;
    }
    store.addQuads(got.quads);
    return;
  }
  store.addQuads(new Parser({ format, baseIRI }).parse(text));
}
