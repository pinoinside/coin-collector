import {
  getCoinData,
  isInWishlist,
  toggleWishlist,
  updateQuantity,
  updateNotes
} from './collection.js';

import { getCountryName } from './catalog.js';

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

const attr = escapeHtml;

function coinImage(coin, className = 'coin-image') {
  if (!coin.image_url) {
    return `
      <div class="${className}">
        <span class="muted">Immagine non disponibile</span>
      </div>`;
  }

  const url = String(coin.image_url).split(/[?#]/)[0];
  const isJpg = /\.(jpe?g)$/i.test(url);

  return `
    <div class="${className}${isJpg ? ' coin-image-jpg' : ''}">
      <img
        src="${attr(coin.image_url)}"
        alt="${attr(coin.title || 'Moneta')}"
        loading="lazy"
        onerror="this.style.display='none'"
      >
    </div>`;
}

function renderWishlistButton(coinId, inWish) {
  const label = inWish
    ? 'Rimuovi dalla wishlist'
    : 'Aggiungi alla wishlist';

  return `
    <button
      class="wishlist-button ${inWish ? 'active' : ''}"
      data-toggle-wishlist="${attr(coinId)}"
      aria-label="${label}"
      aria-pressed="${inWish}"
      title="${label}"
    >
      <i
        class="fa-${inWish ? 'solid' : 'regular'} fa-star"
        aria-hidden="true"
      ></i>
    </button>
  `;
}

function renderCoinStatus(ownedCount) {
  if (ownedCount > 0) {
    return `
      <span
        class="owned-indicator"
        title="Moneta posseduta"
        aria-label="Moneta posseduta"
      >
        <i class="fa-solid fa-check" aria-hidden="true"></i>
      </span>
    `;
  }

  return `
    <span class="coin-manage-hint">
      Gestisci
      <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
    </span>
  `;
}

export function renderCoinCard(coin, ownedCount = 0) {
  const inWish = isInWishlist(coin.id);

  const germany = ['DE', 'DEU', 'GERMANIA'].includes(
    String(coin.country || '').toUpperCase().trim()
  );

  return `
    <article
      class="coin-card"
      data-open-coin="${attr(coin.id)}"
      tabindex="0"
      role="button"
      aria-label="Gestisci ${attr(coin.title || 'moneta senza titolo')}"
    >
      <div class="coin-card-top">
        <div class="coin-card-meta">
          <span class="coin-country">
            ${escapeHtml(getCountryName(coin.country))}
          </span>
          <span class="coin-year">
            ${escapeHtml(coin.year ?? '')}
          </span>
        </div>

        ${renderWishlistButton(coin.id, inWish)}
      </div>

      <div class="coin-image-stage">
        ${coinImage(coin)}
      </div>

      <h3 class="coin-card-title">
        ${escapeHtml(coin.title || 'Moneta senza titolo')}
      </h3>

      <div class="coin-card-footer">
        ${renderCoinStatus(ownedCount)}
      </div>
    </article>
  `;
}

export function renderCoinListItem(coin, ownedCount = 0) {
  const inWish = isInWishlist(coin.id);

  return `
    <article
      class="coin-list-item"
      data-open-coin="${attr(coin.id)}"
      tabindex="0"
      role="button"
      aria-label="Gestisci ${attr(coin.title || 'moneta senza titolo')}"
    >
      <div class="coin-list-image">
        ${coinImage(coin)}
      </div>

      <div class="coin-list-content">
        <div class="coin-list-meta">
          <span class="coin-country">
            ${escapeHtml(getCountryName(coin.country))}
          </span>
          <span class="coin-year">
            ${escapeHtml(coin.year ?? '')}
          </span>

          ${renderWishlistButton(coin.id, inWish)}
        </div>

        <h3 class="coin-list-title">
          ${escapeHtml(coin.title || 'Moneta senza titolo')}
        </h3>
      </div>

      <div class="coin-list-status">
        ${renderCoinStatus(ownedCount)}
      </div>
    </article>
  `;
}

export function renderFilters({
  countries,
  years,
  interestCountries,
  searchQuery,
  collectionFilter,
  selectedCountry,
  selectedInterestCountry,
  selectedYear,
  selectedStatus
}) {
  const options = (items, selected, placeholder) => `
    <option value="">${placeholder}</option>
    ${items.map(item => {
      const value = typeof item === 'object' ? item.code : item;
      const label = typeof item === 'object' ? item.name : item;

      return `
        <option value="${attr(value)}"
          ${String(value) === String(selected) ? 'selected' : ''}>
          ${escapeHtml(label)}
        </option>`;
    }).join('')}`;

  return `
    <section class="catalog-filters">
      <div class="filters">
        <div class="field search-field">
          <label for="search-query">Cerca monete</label>
          <input
            id="search-query"
            type="search"
            value="${attr(searchQuery)}"
            placeholder="Titolo o descrizione…"
          >
        </div>

        <div class="field">
          <label for="collection-filter">Collezione</label>
          <select id="collection-filter">
            <option value="all" ${collectionFilter === 'all' ? 'selected' : ''}>Tutte</option>
            <option value="owned" ${collectionFilter === 'owned' ? 'selected' : ''}>Possedute</option>
            <option value="missing" ${collectionFilter === 'missing' ? 'selected' : ''}>Da trovare</option>
            <option value="wishlist" ${collectionFilter === 'wishlist' ? 'selected' : ''}>Wishlist</option>
          </select>
        </div>

        <div class="field">
          <label for="country-filter">Paese</label>
          <select id="country-filter">
            ${options(countries, selectedCountry, 'Tutti i paesi')}
          </select>
        </div>

        <div class="field">
            <label for="interest-country-filter">Paesi d'interesse</label>
            <select id="interest-country-filter">
                <option value="all"
                ${selectedInterestCountry === 'all' ? 'selected' : ''}>
                Tutti
                </option>
                <option value="interest"
                ${selectedInterestCountry === 'interest' ? 'selected' : ''}>
                Solo d'interesse
                </option>
            </select>
        </div>

        <div class="field">
          <label for="year-filter">Anno</label>
          <select id="year-filter">
            ${options(years, selectedYear, 'Tutti')}
          </select>
        </div>

        <div class="field">
          <label for="status-filter">Emissione</label>
          <select id="status-filter">
            <option value="">Tutte</option>
            <option value="issued" ${selectedStatus === 'issued' ? 'selected' : ''}>Emessa</option>
            <option value="announced" ${selectedStatus === 'announced' ? 'selected' : ''}>Annunciata</option>
          </select>
        </div>

        <div class="filter-footer">
            <button class="button button-secondary" id="reset-filters" type="button">
                Azzera filtri
            </button>
        </div>

      </div>

    </section>`;
}

const capitalizeFirst = text => {
  if (!text) return '';
  const trimmed = String(text).trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export function renderCoinModal(coin) {
  const data = getCoinData(coin.id);
  const inWish = isInWishlist(coin.id);
  const total = data.fdc + data.circ + data.proof + data.reverse;
  const formatMintage = value => !value
    ? 'Non nota / TBA'
    : `${new Intl.NumberFormat('it-IT').format(value)} esemplari`;

  const quantityRow = (key, title, subtitle) => `
    <div class="quantity-row">
      <div class="quantity-row-info">
        <strong>${title}</strong>
        <div class="small muted">${subtitle}</div>
      </div>
      <div class="quantity-controls">
        <button type="button" class="button button-ghost" data-quantity="${key}" data-delta="-1" aria-label="Diminuisci ${title}">−</button>
        <span class="quantity-value">${data[key] || 0}</span>
        <button type="button" class="button button-ghost" data-quantity="${key}" data-delta="1" aria-label="Aumenta ${title}">+</button>
      </div>
    </div>`;

  const cleanDescription = coin.description ? capitalizeFirst(coin.description) : '';

  return `
    <div class="modal-overlay" id="coin-modal-overlay">
      <section class="modal coin-modal" role="dialog" aria-modal="true" aria-label="${attr(coin.title)}">
        <header class="modal-header">
          <div class="coin-modal-header-meta">
            <span class="coin-country">${escapeHtml(getCountryName(coin.country))}</span>
            <span class="small muted">${escapeHtml(coin.year ?? '')}</span>
          </div>
          <button class="button button-secondary icon-button" data-close-modal aria-label="Chiudi">✕</button>
        </header>

        <div class="modal-body">
          <div class="coin-modal-top-title">
            <h2>${escapeHtml(coin.title || 'Moneta')}</h2>
            ${renderWishlistButton(coin.id, inWish)}
          </div>

          <div class="coin-modal-layout">
            <div class="coin-modal-col-left">
              <div class="coin-modal-image">
                ${coinImage(coin, 'modal-coin-image')}
              </div>
              <table class="coin-specs-table" style="margin-top: 16px;">
                <tbody>
                  <tr>
                    <td class="muted">Tiratura</td>
                    <td><strong>${escapeHtml(formatMintage(coin.mintage))}</strong></td>
                  </tr>
                  ${coin.designer ? `<tr><td class="muted">Incisore / autore</td><td><strong>${escapeHtml(coin.designer)}</strong></td></tr>` : ''}
                  ${coin.issue_date ? `<tr><td class="muted">Data emissione</td><td><strong>${escapeHtml(coin.issue_date)}</strong></td></tr>` : ''}
                  ${coin.mint_mark ? `<tr><td class="muted">Zecca</td><td><strong>${escapeHtml(coin.mint_mark)}</strong></td></tr>` : ''}
                </tbody>
              </table>
              ${cleanDescription ? `<p class="muted" style="margin-top: 12px;">${escapeHtml(cleanDescription)}</p>` : ''}
            </div>

            <div class="coin-modal-col-right">
              <h3>Collezione</h3>
              <p class="small muted" style="margin-bottom: 12px;">Totale: <strong>${total}</strong> pezzi</p>
              
              <div class="quantity-list">
                ${quantityRow('fdc', 'Fior di Conio / Nuova', 'Da rotolino / FDC / UNC')}
                ${quantityRow('circ', 'Usata / Viaggiata', 'Circolata / trovata nel resto')}
                ${quantityRow('proof', 'Proof / Astuccio', 'Fondo specchio / FS')}
                ${quantityRow('reverse', 'Coincard / Reverse', 'Versione speciale / Reverse Proof')}
              </div>

              <div class="field" style="margin-top: 16px;">
                <label for="coin-notes">Note, varianti o errori di conio</label>
                <textarea id="coin-notes" rows="3" placeholder="Es. Zecca G, asse ruotato…">${escapeHtml(data.notes)}</textarea>
                <div class="form-help" id="notes-status" style="margin-top: 4px;">Le note vengono salvate automaticamente.</div>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer" style="display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-top: 1px solid var(--border);">
          <span class="small muted">Salvataggio automatico</span>
          <button class="button primary" data-close-modal>Chiudi</button>
        </footer>
      </section>
    </div>`;
}

export function handleComponentAction(event, getActiveCoin, closeModal) {
  const wishlistButton = event.target.closest('[data-toggle-wishlist]');
  if (wishlistButton) {
    event.stopPropagation();
    toggleWishlist(wishlistButton.dataset.toggleWishlist);
    return true;
  }

  if (event.target.closest('[data-modal-wishlist]')) {
    const coin = getActiveCoin();
    if (coin) toggleWishlist(coin.id);
    return true;
  }

  const quantityButton = event.target.closest('[data-quantity]');
  if (quantityButton) {
    const coin = getActiveCoin();
    if (coin) {
      updateQuantity(
        coin.id,
        quantityButton.dataset.quantity,
        Number(quantityButton.dataset.delta)
      );
    }
    return true;
  }

  if (event.target.closest('[data-close-modal]') ||
      event.target.id === 'coin-modal-overlay') {
    closeModal();
    return true;
  }

  return false;
}

export { updateNotes };