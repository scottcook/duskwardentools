export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'dw_theme';

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

export function getThemeScript(): string {
  return `
    (function() {
      var storageKey = '${THEME_STORAGE_KEY}';
      var root = document.documentElement;
      var theme = 'dark';
      try {
        var stored = localStorage.getItem(storageKey);
        if (stored === 'light' || stored === 'dark') {
          theme = stored;
        }
      } catch (error) {}
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    })();
  `;
}
