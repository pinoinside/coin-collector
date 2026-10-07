import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'euro_coin_collection_v2';
const collection = ref({});

// Caricamento iniziale da LocalStorage
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    collection.value = JSON.parse(saved);
  }
} catch (e) {
  console.error("Errore nel caricamento della collezione:", e);
}

// Salvataggio automatico
watch(collection, (newVal) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
  } catch (e) {
    console.error("Errore nel salvataggio della collezione:", e);
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
    if (!collection.value[coinId]) {
      collection.value[coinId] = {};
    }
    if (!collection.value[coinId][mintCode]) {
      collection.value[coinId][mintCode] = {};
    }
    
    const current = collection.value[coinId][mintCode][typeId] || 0;
    const nextVal = Math.max(0, current + delta);
    
    collection.value[coinId][mintCode][typeId] = nextVal;
    // Forziamo il trigger della reattività Vue
    collection.value = { ...collection.value };
  };

  const ownedTotalsByCoinId = computed(() => {
    const totals = {};
    Object.keys(collection.value).forEach(coinId => {
      let sum = 0;
      const coinData = collection.value[coinId];
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

  const exportCollection = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collection.value, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `collezione_2euro_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  };

  const importCollectionData = (data) => {
    if (typeof data === 'object' && data !== null) {
      collection.value = data;
      return { success: true };
    }
    return { success: false, reason: "Formato dati non valido" };
  };

  return {
    collection,
    ownedTotalsByCoinId,
    totalOwnedPieces,
    getQuantity,
    getMintTotal,
    updateCount,
    exportCollection,
    importCollectionData
  };
}