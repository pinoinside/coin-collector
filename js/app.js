import {
  fetchCoins,
  getCoins,
  getAvailableCountries,
  getAvailableYears,
  getCatalogError
} from './catalog.js';

import {
  getOwnedTotalsByCoinId,
  getTotalOwnedPieces,
  isInWishlist,
  getSettings,
  exportCollection,
  importCollectionData,
  updateNotes
} from './collection.js';

import {
  renderCoinCard,
  renderCoinListItem,
  renderFilters,
  renderCoinModal,
  handleComponentAction
} from './components.js';

import {
  renderSettings,
  handleSettingsAction,
  initTheme
} from './settings.js';

import { renderMap } from './map.js';

const pageContent = document.querySelector('#page-content');
const modalRoot = document.querySelector('#modal-root');

const state = {
  page: 'catalog',
  searchQuery: '',
  collectionFilter: 'all',
  selectedCountry: '',
  selectedInterestCountry: 'all',
  selectedYear: '',
  selectedStatus: '',
  viewMode: 'grid',
  selectedCoinId: null
};

function findActiveCoin() {
  return getCoins().find(
    coin => String(coin.id) === String(state.selectedCoinId)
  ) || null;
}

function filteredCoins() {
  const owned = getOwnedTotalsByCoinId();
  const query = state.searchQuery.trim().toLocaleLowerCase('it');

  return getCoins().filter(coin => {
    const count = owned[coin.id] || 0;

    if (state.collectionFilter === 'owned' && count === 0) return false;
    if (state.collectionFilter === 'missing' && count > 0) return false;
    if (state.collectionFilter === 'wishlist' && !isInWishlist(coin.id)) {
      return false;
    }

    if (query) {
      const title = String(coin.title || '').toLocaleLowerCase('it');
      const description = String(coin.description || '').toLocaleLowerCase('it');

      if (!title.includes(query) && !description.includes(query)) {
        return false;
      }
    }

    if (
      state.selectedCountry &&
      String(coin.country || '').trim().toUpperCase() !== state.selectedCountry
    ) {
      return false;
    }

    if (state.selectedInterestCountry === 'interest') {
        const interestCountries = getSettings().interestCountries || [];

        if (!interestCountries.includes(
            String(coin.country || '').trim().toUpperCase()
        )) {
            return false;
        }
    }

    if (
      state.selectedYear &&
      String(coin.year) !== String(state.selectedYear)
    ) {
      return false;
    }

    if (
      state.selectedStatus &&
      coin.status !== state.selectedStatus
    ) {
      return false;
    }

    return true;
  });
}

function renderHeaderStats() {
  const total = String(getTotalOwnedPieces());

  const headerCounter = document.querySelector('#header-owned-count');
  const catalogCounter = document.querySelector('#owned-pieces-count');

  if (headerCounter) headerCounter.textContent = total;
  if (catalogCounter) catalogCounter.textContent = total;
}

function renderCatalog() {
  const availableCountries = getAvailableCountries();
  const interestCodes = new Set(getSettings().interestCountries);

  const interestCountries = availableCountries.filter(
    country => interestCodes.has(country.code)
  );

  const filterHtml = renderFilters({
    countries: availableCountries,
    years: getAvailableYears(),
    interestCountries,
    searchQuery: state.searchQuery,
    collectionFilter: state.collectionFilter,
    selectedCountry: state.selectedCountry,
    selectedInterestCountry: state.selectedInterestCountry,
    selectedYear: state.selectedYear,
    selectedStatus: state.selectedStatus
  });

  const result = filteredCoins();
  const owned = getOwnedTotalsByCoinId();

  pageContent.innerHTML = `
    ${filterHtml}

    <div class="catalog-toolbar">
        <div class="catalog-count">
            <span class="small muted">Monete visualizzate</span>
            <strong>${result.length}</strong>
        </div>

        <div class="view-switch" role="group" aria-label="Modalità di visualizzazione">
        <button
            class="button ${state.viewMode === 'grid' ? 'button-primary' : 'button-secondary'}"
            data-view-mode="grid"
            aria-pressed="${state.viewMode === 'grid'}"
        >
            <i class="fa-solid fa-grip" aria-hidden="true"></i>
            Griglia
        </button>

        <button
            class="button ${state.viewMode === 'list' ? 'button-primary' : 'button-secondary'}"
            data-view-mode="list"
            aria-pressed="${state.viewMode === 'list'}"
        >
            <i class="fa-solid fa-list" aria-hidden="true"></i>
            Lista
        </button>
        </div>

    </div>

    ${result.length === 0
      ? `<div class="empty-state panel">
            <i class="fa-regular fa-folder-open"></i>
            <h3>Nessun risultato</h3>
            <p>Nessuna moneta trovata con i filtri selezionati.</p>
        </div>`
      : `<div class="${state.viewMode === 'grid' ? 'coin-grid' : 'coin-list'}">
          ${result.map(coin =>
            state.viewMode === 'grid'
              ? renderCoinCard(coin, owned[coin.id] || 0)
              : renderCoinListItem(coin, owned[coin.id] || 0)
          ).join('')}
        </div>`
    }
  `;

  renderHeaderStats();
}

function renderActivePage() {
  document.querySelectorAll('[data-page]').forEach(button => {
    button.classList.toggle('active', button.dataset.page === state.page);
  });

  if (state.page === 'catalog') {
    renderCatalog();
  } else if (state.page === 'settings') {
    pageContent.innerHTML = renderSettings();
  } else if (state.page === 'map') {
    renderMap(pageContent);
  }
}

function openCoin(id) {
  state.selectedCoinId = String(id);
  renderModal();
}

function closeModal() {
  state.selectedCoinId = null;
  modalRoot.innerHTML = '';
}

function renderModal() {
  const coin = findActiveCoin();

  if (!coin) {
    closeModal();
    return;
  }

  modalRoot.innerHTML = renderCoinModal(coin);
}

function refreshAfterCollectionChange() {
  renderHeaderStats();

  if (state.page === 'catalog') {
    renderCatalog();
  } else if (state.page === 'map') {
    renderActivePage();
  } else if (state.page === 'settings') {
    renderActivePage();
  }

  if (state.selectedCoinId !== null) {
    renderModal();
  }
}

// Ricerca testuale: mantiene il cursore durante l'aggiornamento.
pageContent.addEventListener('input', event => {
  if (event.target.id === 'search-query') {
    state.searchQuery = event.target.value;

    const cursor = event.target.selectionStart;
    renderCatalog();

    const search = document.querySelector('#search-query');

    if (search) {
      search.focus();
      search.setSelectionRange(cursor, cursor);
    }
  }
});

// Salvataggio note della modale.
modalRoot.addEventListener('input', event => {
  if (event.target.id !== 'coin-notes') return;

  const coin = findActiveCoin();

  if (coin) {
    updateNotes(coin.id, event.target.value);

    const status = document.querySelector('#notes-status');

    if (status) {
      status.textContent = 'Note salvate.';
    }
  }
});

// Salvataggio dei filtri a selezione.
pageContent.addEventListener('change', event => {
  const filterMap = {
    'collection-filter': 'collectionFilter',
    'country-filter': 'selectedCountry',
    'interest-country-filter': 'selectedInterestCountry',
    'year-filter': 'selectedYear',
    'status-filter': 'selectedStatus'
  };

  const stateKey = filterMap[event.target.id];

  if (!stateKey) return;

  state[stateKey] = event.target.value;
  renderCatalog();
});

// Click nella pagina corrente.
pageContent.addEventListener('click', event => {
  if (state.page === 'settings' && handleSettingsAction(event)) {
    renderActivePage();
    return;
  }

  if (event.target.closest('#reset-filters')) {
    Object.assign(state, {
      searchQuery: '',
      collectionFilter: 'all',
      selectedCountry: '',
      selectedInterestCountry: 'all',
      selectedYear: '',
      selectedStatus: ''
    });

    renderCatalog();
    return;
  }

  const viewButton = event.target.closest('[data-view-mode]');

  if (viewButton) {
    state.viewMode = viewButton.dataset.viewMode;
    renderCatalog();
    return;
  }

  if (handleComponentAction(event, findActiveCoin, closeModal)) {
    if (state.page === 'catalog') renderCatalog();
    renderModal();
    return;
  }

  const coinCard = event.target.closest('[data-open-coin]');

  if (coinCard) {
    openCoin(coinCard.dataset.openCoin);
  }
});

// Accessibilità: apertura scheda da tastiera.
pageContent.addEventListener('keydown', event => {
  if (
    (event.key === 'Enter' || event.key === ' ') &&
    event.target.matches('[data-open-coin]')
  ) {
    event.preventDefault();
    openCoin(event.target.dataset.openCoin);
  }
});

// Azioni dentro la modale.
modalRoot.addEventListener('click', event => {
  if (handleComponentAction(event, findActiveCoin, closeModal)) {
    if (state.selectedCoinId !== null) {
      renderModal();
    }

    if (state.page === 'catalog') {
      renderCatalog();
    }
  }
});

// Navigazione principale.
document.querySelectorAll('[data-page]').forEach(button => {
  button.addEventListener('click', () => {
    state.page = button.dataset.page;
    renderActivePage();
  });
});

// Esportazione backup.
document.querySelector('#export-button')
  .addEventListener('click', exportCollection);

// Apertura selettore file per l'importazione.
document.querySelector('#import-button')
  .addEventListener('click', () => {
    document.querySelector('#import-file').click();
  });

// Importazione backup JSON.
document.querySelector('#import-file')
  .addEventListener('change', async event => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!confirm(
        'Importare questo backup e sostituire la collezione attuale?'
      )) {
        return;
      }

      const result = importCollectionData(data);

      if (!result.success) {
        alert(result.reason || 'Backup non valido.');
      } else {
        alert('Collezione importata correttamente.');
        refreshAfterCollectionChange();
      }
    } catch (error) {
      console.error('Errore importazione:', error);
      alert('Impossibile leggere il file. Verifica che sia un backup JSON valido.');
    } finally {
      event.target.value = '';
    }
  });

// Aggiornamento in seguito alle modifiche ai dati.
for (const eventName of [
  'collectionchange',
  'wishlistchange',
  'settingschange'
]) {
  window.addEventListener(eventName, refreshAfterCollectionChange);
}

async function init() {
  initTheme();

  pageContent.innerHTML = `
    <div class="loading-state">Caricamento catalogo…</div>
  `;

  const result = await fetchCoins();

  if (result.error || getCatalogError()) {
    pageContent.innerHTML = `
      <div class="panel empty-state">
        <h2>Impossibile caricare il catalogo</h2>
        <p>
          Controlla che catalog.json si trovi nella cartella principale
          del sito e che sia JSON valido.
        </p>
        <button class="button button-primary" id="retry-catalog">
          Riprova
        </button>
      </div>
    `;

    pageContent.querySelector('#retry-catalog')
      ?.addEventListener('click', init);

    return;
  }

  renderActivePage();
}

// Menu responsive dell'header.
const appHeader = document.querySelector('.app-header');
const menuToggle = document.querySelector('#mobile-menu-toggle');
const headerMenu = document.querySelector('#header-menu');

function closeHeaderMenu() {
  if (!appHeader || !menuToggle) return;

  appHeader.classList.remove('menu-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Apri il menu');
}

function toggleHeaderMenu() {
  if (!appHeader || !menuToggle) return;

  const isOpen = appHeader.classList.toggle('menu-open');

  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute(
    'aria-label',
    isOpen ? 'Chiudi il menu' : 'Apri il menu'
  );
}

menuToggle?.addEventListener('click', toggleHeaderMenu);

// Chiude il menu dopo aver scelto una pagina.
headerMenu?.addEventListener('click', event => {
  if (event.target.closest('[data-page]')) {
    closeHeaderMenu();
  }
});

// Chiude con Escape.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeHeaderMenu();
  }
});

// Chiude cliccando fuori dall'header.
document.addEventListener('click', event => {
  if (
    appHeader?.classList.contains('menu-open') &&
    !appHeader.contains(event.target)
  ) {
    closeHeaderMenu();
  }
});

// Se si torna alla visualizzazione desktop, ripristina lo stato chiuso.
window.addEventListener('resize', () => {
  if (window.innerWidth > 760) {
    closeHeaderMenu();
  }
});


init();