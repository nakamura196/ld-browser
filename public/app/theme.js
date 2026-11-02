// Light / dark toggle. The initial data-theme is set by the inline script in <head>.
const root = document.documentElement;
const btn = document.getElementById('theme');

function sync() {
  const dark = root.dataset.theme === 'dark';
  // The button names the mode it switches to.
  const label = dark ? btn.dataset.toLight : btn.dataset.toDark;
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

btn.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  // The shared design (react-ui static.css) reads html.dark / html.light.
  root.classList.remove('dark', 'light');
  root.classList.add(next);
  try { localStorage.setItem('ldb-theme', next); } catch { /* storage may be blocked; the choice then lasts for this page only */ }
  sync();
});
sync();
