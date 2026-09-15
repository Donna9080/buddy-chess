// theme-switcher.js — self-initializing. Any page that wants a theme picker
// just needs an element with id="theme-switcher" and this script tag; no
// wiring required from the page's own code.

const THEMES = [
  { id: 'adult', label: 'Adult' },
  { id: 'children', label: 'Kids' },
  { id: 'cool', label: 'Cool' },
  { id: 'messy', label: 'Messy' },
  { id: 'professional', label: 'Professional' },
];

const STORAGE_KEY = 'buddy-theme';

function applyTheme(themeId) {
  document.body.className = `theme-${themeId}`;
}

function loadSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveTheme(themeId) {
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    // Browser storage can be unavailable (private mode, disabled cookies).
    // Theming still works for this visit, it just won't be remembered.
  }
}

function initThemeSwitcher() {
  const container = document.getElementById('theme-switcher');
  if (!container) return;

  const saved = loadSavedTheme();
  const initial = THEMES.some((theme) => theme.id === saved) ? saved : 'adult';
  applyTheme(initial);

  for (const theme of THEMES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-choice';
    button.textContent = theme.label;
    button.setAttribute('aria-pressed', String(theme.id === initial));
    button.addEventListener('click', () => {
      applyTheme(theme.id);
      saveTheme(theme.id);
      for (const child of container.children) {
        child.setAttribute('aria-pressed', String(child === button));
      }
    });
    container.appendChild(button);
  }
}

initThemeSwitcher();
