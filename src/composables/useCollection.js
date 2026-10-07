import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'euro_coin_collection_v2';
const collection = ref({});

// Caricamento sicuro da LocalStorage con gestione errori
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed === 'object' && parsed !== null) {
        collection.value = parsed;
      }
    }
  } catch (e) {
    console.error("Errore nel caricamento della collezione da LocalStorage:", e);
  }
};

// Eseguiamo il caricamento sincrono all'avvio del modulo
loadFromStorage();

// Salvataggio automatico ad ogni modifica
watch(collection, (newVal) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
  } catch (e) {
    console.error("Errore nel salvataggio della collezione:", e);
  }
}, { deep: true });

export function useCollection() {
  
  // Ritorna la quantità specifica per moneta, zecca e stato (es. UNC, BU, PROOF)
  const getQuantity = (coinId, mintCode = 'STD', typeId = 'unc') => {
    return collection.value?.[coinId]?.[mintCode]?.[typeId] || 0;
  };

  // Ritorna il totale dei pezzi per una specifica zecca
  const getMintTotal = (coinId, mintCode = 'STD') => {
    const mintData = collection.value?.[coinId]?.[mintCode];
    if (!mintData) return 0;
    return Object.values(mintData).reduce((a, b) => a + Number(b || 0), 0);
  };

  // Aggiorna il conteggio garantendo reattività immediata su Vue
  const updateCount = (coinId, mintCode, typeId, delta) => {
    const next = JSON.parse(JSON.stringify(collection.value));
    
    if (!next[coinId]) next[coinId] = {};
    if (!next[coinId][mintCode]) next[coinId][mintCode] = {};

    const current = next[coinId][mintCode][typeId] || 0;
    const nextVal = Math.max(0, current + delta);

    next[coinId][mintCode][typeId] = nextVal;

    // Pulizia delle chiavi vuote per mantenere il JSON leggero
    if (nextVal === 0) {
      delete next[coinId][mintCode][typeId];
      if (Object.keys(next[coinId][mintCode]).length === 0) {
        delete next[coinId][mintCode];
      }
      if (Object.keys(next[coinId]).length === 0) {
        delete next[coinId];
      }
    }

    collection.value = next;
  };

  // Computata che restituisce una mappa: { coinId: totalePezziPosseduti }
  const ownedTotalsByCoinId = computed(() => {
    const totals = {};
    const col = collection.value || {};

    Object.keys(col).forEach(coinId => {
      let sum = 0;
      const coinData = col[coinId];
      if (coinData && typeof coinData === 'object') {
        Object.values(coinData).forEach(mintObj => {
          if (mintObj && typeof mintObj === 'object') {
            Object.values(mintObj).forEach(q => {
              sum += Number(q || 0);
            });
          } else if (typeof mintObj === 'number') {
            sum += mintObj;
          }
        });
      }
      if (sum > 0) {
        totals[coinId] = sum;
      }
    });

    return totals;
  });

  // Totale complessivo di tutte le monete in collezione
  const totalOwnedPieces = computed(() => {
    return Object.values(ownedTotalsByCoinId.value).reduce((a, b) => a + b, 0);
  });

  // Export della collezione in formato file JSON
  const exportCollection = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(collection.value, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `collezione_2euro_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
  };

  // Import della collezione da file JSON o oggetto
  const importCollectionData = (data) => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (typeof parsed === 'object' && parsed !== null) {
        collection.value = parsed;
        return { success: true };
      }
      return { success: false, reason: "Formato JSON non valido" };
    } catch (e) {
      return { success: false, reason: e.message };
    }
  };

  return {
    collection,
    ownedTotalsByCoinId,
    totalOwnedPieces,
    getQuantity,
    getMintTotal,
    updateCount,
    exportCollection,
    importCollectionData,
    loadFromStorage
  };
}