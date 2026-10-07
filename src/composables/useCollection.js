import { ref, computed } from 'vue';

const CURRENT_SCHEMA_VERSION = 1;
const collection = ref({});

export function useCollection() {
  const loadCollection = () => {
    try {
      const saved = localStorage.getItem('euro_coins_collection');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          collection.value = parsed.collection || parsed;
        }
      }
    } catch (e) {
      console.error("Errore durante il caricamento della collezione:", e);
    }
  };

  const saveCollection = () => {
    localStorage.setItem('euro_coins_collection', JSON.stringify(collection.value));
  };

  const getQuantity = (coinId, mintCode, typeId) => {
    return collection.value[coinId]?.[mintCode]?.[typeId] || 0;
  };

  const getMintTotal = (coinId, mintCode) => {
    const mintData = collection.value[coinId]?.[mintCode];
    if (!mintData) return 0;
    return (mintData.used || 0) + (mintData.unc || 0) + (mintData.proof || 0) + (mintData.coincard || 0);
  };

  const getCoinTotalCount = (coinId) => {
    const coinData = collection.value[coinId];
    if (!coinData) return 0;
    let total = 0;
    for (const mintKey in coinData) {
      for (const typeKey in coinData[mintKey]) {
        total += coinData[mintKey][typeKey] || 0;
      }
    }
    return total;
  };

  // Mappa indicizzata O(1) per evitare il ricalcolo ricorsivo nei filtri
  const ownedTotalsByCoinId = computed(() => {
    const map = {};
    for (const coinId in collection.value) {
      map[coinId] = getCoinTotalCount(coinId);
    }
    return map;
  });

  const updateCount = (coinId, mintCode, typeId, delta) => {
    if (!collection.value[coinId]) {
      collection.value[coinId] = {};
    }
    if (!collection.value[coinId][mintCode]) {
      collection.value[coinId][mintCode] = { used: 0, unc: 0, proof: 0, coincard: 0 };
    }
    
    const current = collection.value[coinId][mintCode][typeId] || 0;
    const updated = Math.max(0, current + delta);
    collection.value[coinId][mintCode][typeId] = updated;

    saveCollection();
  };

  const totalOwnedPieces = computed(() => {
    let grandTotal = 0;
    for (const coinId in collection.value) {
      grandTotal += getCoinTotalCount(coinId);
    }
    return grandTotal;
  });

  const validateCollectionSchema = (data) => {
    if (typeof data !== 'object' || data === null) {
      return { valid: false, reason: "Il file non contiene un oggetto JSON valido." };
    }
    const rawCollection = data.collection || data;
    if (typeof rawCollection !== 'object' || rawCollection === null) {
      return { valid: false, reason: "Il campo 'collection' dev'essere un oggetto." };
    }
    for (const [coinId, mints] of Object.entries(rawCollection)) {
      if (typeof mints !== 'object' || mints === null) return { valid: false, reason: `Struttura non valida per ${coinId}` };
      for (const [mintCode, conditions] of Object.entries(mints)) {
        if (typeof conditions !== 'object' || conditions === null) return { valid: false, reason: `Zecca ${mintCode} non valida per ${coinId}` };
        for (const [condKey, count] of Object.entries(conditions)) {
          if (typeof count !== 'number' || count < 0) return { valid: false, reason: `Quantità non valida per ${condKey} in ${coinId}` };
        }
      }
    }
    return { valid: true, collectionData: rawCollection };
  };

  const exportCollection = () => {
    const exportPayload = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      collection: collection.value
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `collezione_2euro_v${CURRENT_SCHEMA_VERSION}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importCollectionData = (importedData) => {
    const validation = validateCollectionSchema(importedData);
    if (validation.valid) {
      collection.value = validation.collectionData;
      saveCollection();
      return { success: true };
    }
    return { success: false, reason: validation.reason };
  };

  return {
    collection,
    loadCollection,
    getQuantity,
    getMintTotal,
    getCoinTotalCount,
    ownedTotalsByCoinId,
    updateCount,
    totalOwnedPieces,
    exportCollection,
    importCollectionData
  };
}
