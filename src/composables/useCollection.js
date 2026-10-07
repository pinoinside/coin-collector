import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'euro_coin_collection_v2';
const collection = ref({});

// Carica da LocalStorage
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    collection.value = JSON.parse(saved);
  }
} catch (e) {
  console.error("Errore caricamento LocalStorage:", e);
}

// Salva ogni modifica
watch(collection, (newVal) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
  } catch (e) {
    console.error("Errore salvataggio LocalStorage:", e);
  }
}, { deep: true });

export function useCollection() {
  const getQuantity = (coinId, mintCode = 'STD', typeId = 'unc') => {
    return collection.value?.[coinId]?.[mintCode]?.[typeId] || 0;
  };

  const getMintTotal = (coinId, mintCode = 'STD') => {
    const mintData = collection.value?.[coinId]?.[mintCode];
    if (!mintData) return 0;
    return Object.values(mintData).reduce((a, b) => a + Number(b || 0), 0);
  };

  const updateCount = (coinId, mintCode, typeId, delta) => {
    // Cloniamo lo stato per rompere il riferimento e forzare la reattività di Vue
    const nextCollection = { ...collection.value };
    
    if (!nextCollection[coinId]) {
      nextCollection[coinId] = {};
    }
    if (!nextCollection[coinId][mintCode]) {
      nextCollection[coinId][mintCode] = {};
    }

    const current = nextCollection[coinId][mintCode][typeId] || 0;
    const nextVal = Math.max(0, current + delta);

    nextCollection[coinId][mintCode][typeId] = nextVal;
    
    // Riassegniamo il ref così Vue spara gli aggiornamenti a tutti i componenti
    collection.value = nextCollection;
  };

  const ownedTotalsByCoinId = computed(() => {
    const totals = {};
    const col = collection.value || {};
    
    Object.keys(col).forEach(coinId => {
      let sum = 0;
      const coinData = col[coinId];
      if (coinData && typeof coinData === 'object') {
        Object.values(coinData).forEach(mintObj => {
          if (mintObj && typeof mintObj === 'object') {
            Object.values(mintObj).forEach(q => sum += Number(q || 0));
          }
        });
      }
      totals[coinId] = sum;
    });
    
    return totals;
  });

  const totalOwnedPieces = computed(() => {
    return Object.values(ownedTotalsByCoinId.value).reduce((a, b) => a + b, 0);
  });

  return {
    collection,
    ownedTotalsByCoinId,
    totalOwnedPieces,
    getQuantity,
    getMintTotal,
    updateCount
  };
}