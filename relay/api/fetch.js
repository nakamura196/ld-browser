// ldas relay: fetches a document for the ldas.jp sites (Musubi, Kasane, Awase, ...) when the source
// does not allow cross-origin reads (CORS). The sites first fetch directly and ask the relay only when that fails.
// GET /api/fetch?url=<encoded URL>
// - Only the hosts in HOSTS, and redirects only within them: it is not a general-purpose proxy.
// - Only requests from the sites in ORIGINS, only data content types (RDF, JSON, XML), at most 2 MB.
// - Answers are cached by Vercel's CDN for a day, so repeated views do not run this function again.
// Web-standard handler (Request → Response): runs on Vercel Functions and in a plain Node test.

// Sources the relay may read. Add a host here when one of the sites needs it (and say which, in a comment).
export const HOSTS = [
  'id.ndl.go.jp', // Web NDL Authorities (Musubi): RDF, no CORS
  'vocab.getty.edu', // Getty vocabularies (Musubi): RDF, no CORS
  'd-nb.info', // German National Library GND (Musubi): RDF, no CORS
  'xmlns.com', // FOAF vocabulary file (Musubi): RDF/XML, no CORS
];
// Pages that may use the relay: any ldas.jp site over https, and local development.
const ORIGINS = [/^https:\/\/(?:[a-z0-9-]+\.)*ldas\.jp$/, /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/];
const ACCEPT_DEFAULT = 'text/turtle, application/n-triples;q=0.9, application/ld+json;q=0.8, application/rdf+xml;q=0.5, */*;q=0.1';
const TYPES = /^(?:text\/turtle|text\/n3|application\/(?:n-triples|n-quads|trig|ld\+json|json|rdf\+xml|xml|tei\+xml)|text\/xml|text\/plain)$/;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const MAX_CHUNKS = 100000; // a bound on the read loop; MAX_BYTES ends it long before this
const TIMEOUT_MS = 9000;

function reply(status, body, origin, extra = {}) {
  const headers = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': status === 200 ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'public, s-maxage=300',
    Vary: 'Origin, Accept',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Expose-Headers'] = 'X-Final-Url, X-Upstream-Status';
  }
  return new Response(body, { status, headers });
}

function allowedUrl(s) {
  let u;
  try { u = new URL(s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !HOSTS.includes(u.hostname) || u.port || u.username || u.password) return null;
  u.protocol = 'https:';
  u.hash = '';
  return u;
}

// Read the body, giving up past MAX_BYTES even when no length was announced.
async function readLimited(res) {
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  for (let n = 0; n < MAX_CHUNKS; n++) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { body.set(c, at); at += c.byteLength; }
  return body;
}

export function OPTIONS(request) {
  const origin = request.headers.get('origin') || '';
  if (!ORIGINS.some((re) => re.test(origin))) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Accept', 'Access-Control-Max-Age': '86400', Vary: 'Origin' },
  });
}

export async function GET(request) {
  const origin = request.headers.get('origin') || '';
  const okOrigin = ORIGINS.some((re) => re.test(origin)) ? origin : '';
  if (!okOrigin) return reply(403, 'This relay only serves the ldas.jp sites.', '');

  const target = allowedUrl(new URL(request.url).searchParams.get('url') || '');
  if (!target) return reply(400, `Not a URL this relay fetches. Hosts: ${HOSTS.join(', ')}`, okOrigin);
  const accept = (request.headers.get('accept') || '').slice(0, 300) || ACCEPT_DEFAULT;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    let url = target;
    let res;
    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      res = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'ldas relay (+https://musubi.ldas.jp/)' }, redirect: 'manual', signal: ctl.signal });
      const loc = res.headers.get('location');
      if (res.status < 300 || res.status >= 400 || !loc) break;
      if (i === MAX_REDIRECTS) return reply(508, 'Too many redirects.', okOrigin);
      const next = allowedUrl(new URL(loc, url).href);
      if (!next) return reply(502, 'Redirected outside the hosts this relay fetches.', okOrigin);
      url = next;
    }
    const upstream = { 'X-Final-Url': url.href, 'X-Upstream-Status': String(res.status) };
    if (!res.ok) return reply(res.status, `The source answered ${res.status}.`, okOrigin, upstream);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!TYPES.test(type)) return reply(415, `Not a data document (${type || 'no content type'}).`, okOrigin, upstream);
    if (Number(res.headers.get('content-length') || 0) > MAX_BYTES) return reply(413, 'Larger than 2 MB.', okOrigin, upstream);
    const body = await readLimited(res);
    if (!body) return reply(413, 'Larger than 2 MB.', okOrigin, upstream);
    return reply(200, body, okOrigin, { ...upstream, 'Content-Type': res.headers.get('content-type') });
  } catch (e) {
    return e.name === 'AbortError' ? reply(504, 'The source did not answer in time.', okOrigin) : reply(502, 'Could not reach the source.', okOrigin);
  } finally {
    clearTimeout(timer);
  }
}
