// Local check of the relay: runs the handler on a few requests (no server needed).
import { GET } from './api/fetch.js';
const call = (url, origin = 'http://localhost:4392') =>
  GET(new Request(`http://relay.test/api/fetch?url=${encodeURIComponent(url)}`, { headers: origin ? { Origin: origin } : {} }));
const cases = [
  ['NDL (should be 200)', 'http://id.ndl.go.jp/auth/entity/00270331'],
  ['Getty (should be 200)', 'http://vocab.getty.edu/ulan/500060296'],
  ['DNB (should be 200)', 'https://d-nb.info/gnd/118550853'],
  ['other host (should be 400)', 'https://example.com/'],
];
for (const [name, url] of cases) {
  const r = await call(url);
  const body = await r.arrayBuffer();
  console.log(`${name}: ${r.status} ${r.headers.get('content-type')} ${body.byteLength} bytes, final ${r.headers.get('x-final-url')}, ACAO ${r.headers.get('access-control-allow-origin')}`);
}
const r = await call('http://id.ndl.go.jp/auth/entity/00270331', 'https://evil.example');
console.log(`foreign origin (should be 403): ${r.status}`);
