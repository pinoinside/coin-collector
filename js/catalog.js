const COUNTRY_NAMES = {
  AT: 'Austria',
  BE: 'Belgio',
  BG: 'Bulgaria',
  CY: 'Cipro',
  DE: 'Germania',
  DEU: 'Germania',
  GERMANIA: 'Germania',
  EE: 'Estonia',
  ES: 'Spagna',
  FI: 'Finlandia',
  FR: 'Francia',
  GR: 'Grecia',
  HR: 'Croazia',
  IE: 'Irlanda',
  IT: 'Italia',
  LT: 'Lituania',
  LU: 'Lussemburgo',
  LV: 'Lettonia',
  MT: 'Malta',
  NL: 'Paesi Bassi',
  PT: 'Portogallo',
  SI: 'Slovenia',
  SK: 'Slovacchia',
  MC: 'Monaco',
  SM: 'San Marino',
  VA: 'Città del Vaticano',
  AD: 'Andorra'
};

let coins = [];
let loading = true;
let loadError = null;

export async function fetchCoins() {
  loading = true;
  loadError = null;

  try {
    const response = await fetch('./catalog.json');

    if (!response.ok) {
      throw new Error(`Errore HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Il catalogo deve contenere un array JSON.');
    }

    coins = data;
  } catch (error) {
    loadError = error;
    console.error('Errore nel caricamento del catalogo:', error);
  } finally {
    loading = false;
  }

  return { coins, loading, error: loadError };
}

export function getCoins() {
  return coins;
}

export function isCatalogLoading() {
  return loading;
}

export function getCatalogError() {
  return loadError;
}

export function getCountryName(codeOrName) {
  if (codeOrName == null || codeOrName === '') return 'Sconosciuto';

  const value = String(codeOrName).trim();
  const key = value.toUpperCase();

  return COUNTRY_NAMES[key] || value;
}

export function getAvailableCountries() {
  const unique = new Map();

  for (const coin of coins) {
    if (!coin.country) continue;

    const code = String(coin.country).trim().toUpperCase();
    if (!unique.has(code)) {
      unique.set(code, {
        code,
        name: getCountryName(code)
      });
    }
  }

  return [...unique.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'it')
  );
}

export function getAvailableYears() {
  return [...new Set(
    coins
      .map(coin => String(coin.year ?? ''))
      .filter(Boolean)
  )].sort((a, b) => Number(b) - Number(a));
}
