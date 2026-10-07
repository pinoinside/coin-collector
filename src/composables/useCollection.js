import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'euro_coin_collection_v2';
const collection = ref({});

// Caricamento sincrono iniziale
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (typeof parsed === 'object' && parsed !== null) {
      collection.value = parsed;
    }
  }
} catch (e) {
  console.error("Errore nel caricamento da LocalStorage:", e);
}

// Salvataggio reattivo
watch(collection, (newVal) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
  } catch (e) {
    console.error("Errore nel salvataggio in LocalStorage:", e);
  }
}, { deep: true });

export function useCollection() {
  
  // Ritorna l'oggetto completo di una moneta nell'inventario
  const getCoinData = (coinId) => {
    return collection.value?.[coinId] || { fdc: 0, circ: 0, proof: 0, reverse: 0, notes: '' };
  };

  // Aggiorna la quantità di uno specifico stato
  const updateQuantity = (coinId, stateKey, delta) => {
    const next = JSON.parse(JSON.stringify(collection.value));
    if (!next[coinId]) {
      next[coinId] = { fdc: 0, circ: 0, proof: 0, reverse: 0, notes: '' };
    }

    const current = Number(next[coinId][stateKey] || 0);
    next[coinId][stateKey] = Math.max(0, current + delta);

    collection.value = next;
  };

  // Aggiorna le note / varianti
  const updateNotes = (coinId, text) => {
    const next = JSON.parse(JSON.stringify(collection.value));
    if (!next[coinId]) {
      next[coinId] = { fdc: 0, circ: 0, proof: 0, reverse: 0, notes: '' };
    }

    next[coinId].notes = text;
    collection.value = next;
  };

  // Computata piatta: { [coinId]: totalePezziPosseduti }
  const ownedTotalsByCoinId = computed(() => {
    const totals = {};
    const col = collection.value || {};

    Object.keys(col).forEach(coinId => {
      const data = col[coinId];
      if (!data) return;

      // Gestione retrocompatibile
      let sum = 0;
      if (typeof data === 'object') {
        sum += Number(data.fdc || 0) + Number(data.circ || 0) + Number(data.proof || 0) + Number(data.reverse || 0);
        // Fallback per dati vecchi annidati
        if (sum === 0) {
          Object.values(data).forEach(val => {
            if (typeof val === 'number') sum += val;
            else if (typeof val === 'object' && val !== null) {
              Object.values(val).forEach(v => sum += Number(v || 0));
            }
          });
        }
      }

      if (sum > 0) {
        totals[coinId] = sum;
      }
    });

    return totals;
  });

  const totalOwnedPieces = computed(() => {
    return Object.values(ownedTotalsByCoinId.value).reduce((a, b) => a + b, 0);
  });

  return {
    collection,
    getCoinData,
    updateQuantity,
    updateNotes,
    ownedTotalsByCoinId,
    totalOwnedPieces
  };
}