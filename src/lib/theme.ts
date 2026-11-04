export type Theme = 'light' | 'dark'

export function getInitialTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#11171c' : '#f3f1eb')

  try {
    localStorage.setItem('pp-lab-theme', theme)
  } catch {
    // The visual theme still works when storage is unavailable.
  }
}
