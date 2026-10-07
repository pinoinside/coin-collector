import { ref, computed } from 'vue';
import { useCatalog } from '../composables/useCatalog.js';
import { useCollection } from '../composables/useCollection.js';
import FiltersBar from '../components/FiltersBar.js';
import CoinCard from '../components/CoinCard.js';
import CoinModal from '../components/CoinModal.js';

export default {
  name: 'CatalogView',
  components: { FiltersBar, CoinCard, CoinModal },
  setup() {
    const { coins, loading, getCountryName, availableCountries, availableYears } = useCatalog();
    const { ownedTotalsByCoinId } = useCollection();

    const selectedCoin = ref(null);
    
    // Stati reattivi perfettamente allineati ai v-model della FiltersBar
    const searchQuery = ref('');
    const collectionFilter = ref('all'); // 'all' | 'owned' | 'missing'
    const selectedCountry = ref('');
    const selectedYear = ref('');
    const selectedStatus = ref('');

    // Verifica se ci sono filtri attivi per mostrare il pulsante di reset
    const hasActiveFilters = computed(() => {
      return (
        searchQuery.value.trim() !== '' ||
        collectionFilter.value !== 'all' ||
        selectedCountry.value !== '' ||
        selectedYear.value !== '' ||
        selectedStatus.value !== ''
      );
    });

    const resetFilters = () => {
      searchQuery.value = '';
      collectionFilter.value = 'all';
      selectedCountry.value = '';
      selectedYear.value = '';
      selectedStatus.value = '';
    };

    const filteredCoins = computed(() => {
      return coins.value.filter(coin => {
        const ownedQty = ownedTotalsByCoinId.value[coin.id] || 0;

        // 1. Filtro Possesso (Tutti / Posseduti / Mancanti)
        if (collectionFilter.value === 'owned' && ownedQty === 0) return false;
        if (collectionFilter.value === 'missing' && ownedQty > 0) return false;

        // 2. Filtro Testuale (Titolo o Descrizione)
        if (searchQuery.value && searchQuery.value.trim() !== '') {
          const q = searchQuery.value.toLowerCase().trim();
          const matchTitle = (coin.title || '').toLowerCase().includes(q);
          const matchDesc = (coin.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        // 3. Filtro Paese
        if (selectedCountry.value && selectedCountry.value !== '') {
          const coinCountry = String(coin.country || '').toUpperCase().trim();
          const targetCountry = String(selectedCountry.value).toUpperCase().trim();
          if (coinCountry !== targetCountry) return false;
        }

        // 4. Filtro Anno
        if (selectedYear.value && selectedYear.value !== '') {
          if (String(coin.year) !== String(selectedYear.value)) return false;
        }

        // 5. Filtro Stato Emissione (issued / announced)
        if (selectedStatus.value && selectedStatus.value !== '') {
          if (coin.status !== selectedStatus.value) return false;
        }

        return true;
      });
    });

    const openModal = (coin) => {
      selectedCoin.value = coin;
    };

    const closeModal = () => {
      selectedCoin.value = null;
    };

    return {
      coins,
      loading,
      selectedCoin,
      searchQuery,
      collectionFilter,
      selectedCountry,
      selectedYear,
      selectedStatus,
      hasActiveFilters,
      filteredCoins,
      getCountryName,
      availableCountries,
      availableYears,
      ownedTotalsByCoinId,
      openModal,
      closeModal,
      resetFilters
    };
  },
  template: `
    <div class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      <!-- BARRA FILTRI INTEGRATA CON LA SUA FIRMA ESATTA -->
      <FiltersBar 
        v-model:searchQuery="searchQuery"
        v-model:collectionFilter="collectionFilter"
        v-model:selectedCountry="selectedCountry"
        v-model:selectedYear="selectedYear"
        v-model:selectedStatus="selectedStatus"
        :countries="availableCountries"
        :years="availableYears"
        :hasActiveFilters="hasActiveFilters"
        @reset="resetFilters"
      />

      <div v-if="loading" class="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Caricamento catalogo in corso...</span>
      </div>

      <div v-else-if="filteredCoins.length === 0" class="text-center py-12 text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700/40">
        Nessuna moneta trovata con i filtri selezionati.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <CoinCard 
          v-for="coin in filteredCoins" 
          :key="coin.id" 
          :coin="coin"
          :ownedCount="ownedTotalsByCoinId[coin.id] || 0"
          :countryName="getCountryName(coin.country)"
          @select="openModal"
        />
      </div>

      <CoinModal 
        v-if="selectedCoin" 
        :coin="selectedCoin" 
        :countryName="getCountryName(selectedCoin.country)"
        @close="closeModal"
      />
    </div>
  `
};