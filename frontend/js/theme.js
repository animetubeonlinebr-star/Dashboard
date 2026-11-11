/**
 * Provedor de tema (dark/light) com persistência em localStorage.
 * O tema é aplicado no atributo data-theme do <html>, o que mantém o
 * CSS puramente declarativo (sem classes utilitárias).
 */

const STORAGE_KEY = 'devops-board-theme';
const THEMES = ['dark', 'light'];

/** Tema padrão do produto: escuro (conforme o layout de referência). */
const DEFAULT_THEME = 'dark';

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

function persist(theme) {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* modo privado */ }
}

export function createTheme({ onChange } = {}) {
  let current = readStored() ?? DEFAULT_THEME;

  function apply(theme, { save = true } = {}) {
    current = THEMES.includes(theme) ? theme : 'dark';
    document.documentElement.setAttribute('data-theme', current);
    document.documentElement.style.colorScheme = current;
    if (save) persist(current);
    onChange?.(current);
  }

  function toggle() {
    apply(current === 'dark' ? 'light' : 'dark');
  }

  return {
    apply,
    toggle,
    get current() { return current; },
    isDark: () => current === 'dark',
  };
}
