// theme-switcher.js — self-initializing dark/light toggle. Any page that
// wants it just needs a button with id="theme-toggle" and this script tag.
// With no saved preference, the page follows the system's color scheme
// (handled entirely in base.css); this only takes over once the visitor
// makes an explicit choice, recorded here and reapplied on every visit.

const STORAGE_KEY = 'buddy-color-scheme';

function loadSavedScheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function saveScheme(scheme) {
  try {
    localStorage.setItem(STORAGE_KEY, scheme);
  } catch {
    // Browser storage can be unavailable (private mode, disabled cookies).
    // The toggle still works for this visit, it just won't be remembered.
  }
}

function applyScheme(scheme) {
  if (scheme) {
    document.documentElement.setAttribute('data-theme', scheme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function effectiveScheme() {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit) return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initThemeToggle() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;

  applyScheme(loadSavedScheme());
  updateButton(button);

  button.addEventListener('click', () => {
    const next = effectiveScheme() === 'dark' ? 'light' : 'dark';
    applyScheme(next);
    saveScheme(next);
    updateButton(button);
  });
}

function updateButton(button) {
  const isDark = effectiveScheme() === 'dark';
  button.textContent = isDark ? '\u{1F319}' : '\u{2600}\u{FE0F}';
  button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  button.setAttribute('aria-pressed', String(isDark));
}

initThemeToggle();
