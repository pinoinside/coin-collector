const STORAGE_KEYS = {
  collection: 'euro_coin_collection_v2',
  wishlist: 'euro_coin_wishlist_v1',
  settings: 'euro_coin_settings_v1',
  theme: 'euro_coin_theme'
};

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn(`Impossibile leggere ${key}:`, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Impossibile salvare ${key}:`, error);
    return false;
  }
}

function normalizeCoinData(data = {}) {
  return {
    ...data,
    fdc: Math.max(0, Number(data.fdc) || 0),
    circ: Math.max(0, Number(data.circ) || 0),
    proof: Math.max(0, Number(data.proof) || 0),
    reverse: Math.max(0, Number(data.reverse) || 0),
    notes: String(data.notes || '')
  };
}

let collection = readJSON(STORAGE_KEYS.collection, {});
if (!collection || typeof collection !== 'object' || Array.isArray(collection)) {
  collection = {};
}

let wishlist = new Set(
  Array.isArray(readJSON(STORAGE_KEYS.wishlist, []))
    ? readJSON(STORAGE_KEYS.wishlist, [])
    : []
);

let settings = readJSON(STORAGE_KEYS.settings, { interestCountries: [] });
if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
  settings = { interestCountries: [] };
}
if (!Array.isArray(settings.interestCountries)) {
  settings.interestCountries = [];
}

function saveCollection() {
  writeJSON(STORAGE_KEYS.collection, collection);
}

function saveWishlist() {
  writeJSON(STORAGE_KEYS.wishlist, [...wishlist]);
}

function saveSettings() {
  writeJSON(STORAGE_KEYS.settings, settings);
}

export function getCoinData(coinId) {
  return normalizeCoinData(collection[coinId]);
}

export function getCollection() {
  return collection;
}

export function getWishlist() {
  return [...wishlist];
}

export function getSettings() {
  return { ...settings, interestCountries: [...settings.interestCountries] };
}

export function updateQuantity(coinId, stateKey, delta) {
  const allowedKeys = ['fdc', 'circ', 'proof', 'reverse'];
  if (!allowedKeys.includes(stateKey)) return;

  const id = String(coinId);
  const current = normalizeCoinData(collection[id]);
  current[stateKey] = Math.max(0, current[stateKey] + Number(delta || 0));

  collection = { ...collection, [id]: current };
  saveCollection();

  window.dispatchEvent(new CustomEvent('collectionchange', {
    detail: { coinId: id }
  }));
}

export function updateNotes(coinId, text) {
  const id = String(coinId);
  collection = {
    ...collection,
    [id]: {
      ...normalizeCoinData(collection[id]),
      notes: String(text ?? '')
    }
  };

  saveCollection();
  window.dispatchEvent(new CustomEvent('collectionchange', {
    detail: { coinId: id }
  }));
}

export function isInWishlist(coinId) {
  return wishlist.has(String(coinId));
}

export function toggleWishlist(coinId) {
  const id = String(coinId);

  if (wishlist.has(id)) {
    wishlist.delete(id);
  } else {
    wishlist.add(id);
  }

  saveWishlist();
  window.dispatchEvent(new CustomEvent('wishlistchange', {
    detail: { coinId: id }
  }));

  return wishlist.has(id);
}

export function updateInterestCountries(countries) {
  settings = {
    ...settings,
    interestCountries: [...new Set(
      (Array.isArray(countries) ? countries : []).map(String)
    )]
  };

  saveSettings();
  window.dispatchEvent(new Event('settingschange'));
}

export function updateSettings(nextSettings) {
  settings = { ...settings, ...nextSettings };
  if (!Array.isArray(settings.interestCountries)) {
    settings.interestCountries = [];
  }

  saveSettings();
  window.dispatchEvent(new Event('settingschange'));
}

export function getOwnedTotalsByCoinId() {
  const totals = {};

  for (const [id, rawData] of Object.entries(collection)) {
    const data = normalizeCoinData(rawData);
    const total = data.fdc + data.circ + data.proof + data.reverse;

    if (total > 0) totals[id] = total;
  }

  return totals;
}

export function getTotalOwnedPieces() {
  return Object.values(collection).reduce((sum, rawData) => {
    const data = normalizeCoinData(rawData);
    return sum + data.fdc + data.circ + data.proof + data.reverse;
  }, 0);
}

export function exportCollection() {
  const backup = {
    collection,
    wishlist: [...wishlist],
    settings,
    version: 2,
    date: new Date().toISOString()
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `euro_collection_backup_${new Date().toISOString().slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function importCollectionData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { success: false, reason: 'Il file JSON non è valido.' };
  }

  if (!data.collection || typeof data.collection !== 'object' ||
      Array.isArray(data.collection)) {
    return { success: false, reason: 'Il backup non contiene una collezione valida.' };
  }

  const nextCollection = {};

  for (const [id, value] of Object.entries(data.collection)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    nextCollection[id] = normalizeCoinData(value);
  }

  const nextWishlist = Array.isArray(data.wishlist)
    ? data.wishlist.map(String)
    : [];

  const nextSettings = data.settings && typeof data.settings === 'object'
    ? data.settings
    : { interestCountries: [] };

  collection = nextCollection;
  wishlist = new Set(nextWishlist);
  settings = {
    ...nextSettings,
    interestCountries: Array.isArray(nextSettings.interestCountries)
      ? nextSettings.interestCountries.map(String)
      : []
  };

  saveCollection();
  saveWishlist();
  saveSettings();

  window.dispatchEvent(new Event('collectionchange'));
  window.dispatchEvent(new Event('wishlistchange'));
  window.dispatchEvent(new Event('settingschange'));

  return { success: true };
}
