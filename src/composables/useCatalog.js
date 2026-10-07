import { ref, computed } from 'vue';

const countryNamesMap = {
  'IT': 'Italia', 'ITA': 'Italia', 'DE': 'Germania', 'DEU': 'Germania',
  'FR': 'Francia', 'FRA': 'Francia', 'ES': 'Spagna', 'ESP': 'Spagna',
  'AT': 'Austria', 'AUT': 'Austria', 'BE': 'Belgio', 'BEL': 'Belgio',
  'CY': 'Cipro', 'CYP': 'Cipro', 'EE': 'Estonia', 'EST': 'Estonia',
  'FI': 'Finlandia', 'FIN': 'Finlandia', 'GR': 'Grecia', 'GRC': 'Grecia',
  'IE': 'Irlanda', 'IRL': 'Irlanda', 'LV': 'Lettonia', 'LVA': 'Lettonia',
  'LT': 'Lituania', 'LTU': 'Lituania', 'LU': 'Lussemburgo', 'LUX': 'Lussemburgo',
  'MT': 'Malta', 'MLT': 'Malta', 'MC': 'Monaco', 'MCO': 'Monaco',
  'NL': 'Paesi Bassi', 'NLD': 'Paesi Bassi', 'PT': 'Portogallo', 'PRT': 'Portogallo',
  'SM': 'San Marino', 'SMR': 'San Marino', 'SK': 'Slovacchia', 'SVK': 'Slovacchia',
  'SI': 'Slovenia', 'SVN': 'Slovenia', 'VA': 'Vaticano', 'VAT': 'Vaticano',
  'HR': 'Croazia', 'HRV': 'Croazia', 'AND': 'Andorra', 'AD': 'Andorra'
};

const coins = ref([]);
const loading = ref(true);

export function useCatalog() {
  const fetchCoins = async () => {
    loading.value = true;
    try {
      const res = await fetch(`./catalog.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP status ${res.status}`);
      coins.value = await res.json();
    } catch (e) {
      console.error("Errore nel caricamento del catalogo:", e);
    } finally {
      loading.value = false;
    }
  };

  const getCountryName = (codeOrName) => {
    if (!codeOrName) return 'Sconosciuto';
    const codeUpper = String(codeOrName).toUpperCase().trim();
    return countryNamesMap[codeUpper] || codeOrName;
  };

  const availableCountries = computed(() => {
    const set = new Set(coins.value.map(c => c.country));
    return Array.from(set)
      .filter(Boolean)
      .map(code => ({ code, name: getCountryName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'it'));
  });

  const availableYears = computed(() => {
    const set = new Set(coins.value.map(c => c.year));
    return Array.from(set).filter(Boolean).sort((a, b) => b - a);
  });

  return {
    coins,
    loading,
    fetchCoins,
    getCountryName,
    availableCountries,
    availableYears
  };
}