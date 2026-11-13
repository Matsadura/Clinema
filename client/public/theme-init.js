// Applies the saved theme before first paint (no flash). Loaded as an
// external file because the CSP forbids inline scripts.
try {
  var theme = localStorage.getItem('clinema:theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
  /* storage unavailable: default (dark) theme */
}
