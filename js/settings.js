import {
  getSettings,
  updateInterestCountries
} from './collection.js';

import { getAvailableCountries } from './catalog.js';
import { escapeHtml } from './components.js';

export function renderSettings() {
  const settings = getSettings();
  const selected = new Set(settings.interestCountries);
  const theme = localStorage.getItem('euro_coin_theme') || 'dark';

  return `
    <section class="panel">
      <h1 class="page-title">Impostazioni</h1>
      <p class="muted">Personalizza l'aspetto e i paesi che vuoi seguire.</p>

      <h2>Tema</h2>
      <p class="small muted">Scegli l'aspetto dell'applicazione.</p>
      <div class="row-between" style="justify-content:flex-start;flex-wrap:wrap">
        ${[['dark','Scuro'],['light','Chiaro'],['system','Sistema']].map(([value,label]) => `
          <button class="button ${theme === value ? 'button-primary' : 'button-secondary'}"
                  data-theme-choice="${value}">${label}</button>
        `).join('')}
      </div>

      <hr style="border:0;border-top:1px solid var(--border);margin:24px 0">

        <div class="interest-countries-section">
            <div class="interest-countries-heading">
            <div>
                <h2>Paesi d'interesse</h2>
                <p class="small muted">Personalizza i paesi da seguire nel catalogo.</p>
            </div>
            <span class="interest-count-badge" id="interest-count">${selected.size}</span>
            </div>

            <div class="interest-countries-actions">
            <button class="button button-secondary" id="select-all-countries">
                Seleziona tutti
            </button>
            <button class="button button-secondary" id="clear-countries">
                Deseleziona tutti
            </button>
        </div>

    <div class="country-grid">
      ${getAvailableCountries().map(country => `
        <button class="country-option ${selected.has(country.code) ? 'selected' : ''}"
                data-country-choice="${escapeHtml(country.code)}"
                aria-pressed="${selected.has(country.code)}">
          ${selected.has(country.code) ? '✓ ' : ''}
          ${escapeHtml(country.name)}
        </button>
      `).join('')}
    </div>
  </div>
    </section>`;
}

export function applyTheme(theme) {
  localStorage.setItem('euro_coin_theme', theme);

  const prefersDark = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const effectiveTheme = theme === 'system'
    ? (prefersDark ? 'dark' : 'light')
    : theme;

  document.documentElement.dataset.theme = effectiveTheme;
  document.documentElement.style.colorScheme = effectiveTheme;
}

export function initTheme() {
  applyTheme(localStorage.getItem('euro_coin_theme') || 'dark');

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', () => {
    if ((localStorage.getItem('euro_coin_theme') || 'dark') === 'system') {
      applyTheme('system');
    }
  });
}

export function handleSettingsAction(event) {
  const themeButton = event.target.closest('[data-theme-choice]');

  if (themeButton) {
    applyTheme(themeButton.dataset.themeChoice);
    return true;
  }

  const countryButton = event.target.closest('[data-country-choice]');

  if (countryButton) {
    const code = countryButton.dataset.countryChoice;
    const countries = new Set(getSettings().interestCountries);

    if (countries.has(code)) countries.delete(code);
    else countries.add(code);

    updateInterestCountries([...countries]);
    return true;
  }

  if (event.target.closest('#select-all-countries')) {
    updateInterestCountries(getAvailableCountries().map(country => country.code));
    return true;
  }

  if (event.target.closest('#clear-countries')) {
    updateInterestCountries([]);
    return true;
  }

  return false;
}
