// Light / dark toggle. The initial data-theme is set by the inline script in <head>.
const root = document.documentElement;
const btn = document.getElementById('theme');

function sync() {
  const dark = root.dataset.theme === 'dark';
  // The button names the mode it switches to.
  btn.setAttribute('aria-label', dark ? btn.dataset.toLight : btn.dataset.toDark);
}

btn.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('ldb-theme', next); } catch { /* storage may be blocked; the choice then lasts for this page only */ }
  sync();
});
sync();
