import { ref, computed } from 'vue';
import FiltersBar from '../components/FiltersBar.js';
import CoinCard from '../components/CoinCard.js';
import CoinModal from '../components/CoinModal.js';
import { useCatalog } from '../composables/useCatalog.js';
import { useCollection } from '../composables/useCollection.js';

export default {
  name: 'CatalogView',
  components: {
    FiltersBar,
    CoinCard,
    CoinModal
  },
  setup() {
    const { coins, loading, getCountryName, availableCountries, availableYears } = useCatalog();
    const { ownedTotalsByCoinId } = useCollection();

    const searchQuery = ref('');
    const selectedCountry = ref('');
    const selectedYear = ref('');
    const selectedStatus = ref('');
    const collectionFilter = ref('all');
    const selectedCoin = ref(null);

    const filteredCoins = computed(() => {
      return coins.value.filter(c => {
        const matchesSearch = !searchQuery.value || 
          (c.title && c.title.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
          (c.description && c.description.toLowerCase().includes(searchQuery.value.toLowerCase()));
        const matchesCountry = !selectedCountry.value || c.country === selectedCountry.value;
        const matchesYear = !selectedYear.value || c.year == selectedYear.value;
        const matchesStatus = !selectedStatus.value || c.status === selectedStatus.value;

        const ownedCount = ownedTotalsByCoinId.value[c.id] || 0;
        let matchesCollection = true;
        if (collectionFilter.value === 'owned') {
          matchesCollection = ownedCount > 0;
        } else if (collectionFilter.value === 'missing') {
          matchesCollection = ownedCount === 0;
        }

        return matchesSearch && matchesCountry && matchesYear && matchesStatus && matchesCollection;
      });
    });

    const hasActiveFilters = computed(() => {
      return searchQuery.value || selectedCountry.value || selectedYear.value || selectedStatus.value || collectionFilter.value !== 'all';
    });

    const resetFilters = () => {
      searchQuery.value = '';
      selectedCountry.value = '';
      selectedYear.value = '';
      selectedStatus.value = '';
      collectionFilter.value = 'all';
    };

    return {
      coins,
      loading,
      getCountryName,
      availableCountries,
      availableYears,
      ownedTotalsByCoinId,
      searchQuery,
      selectedCountry,
      selectedYear,
      selectedStatus,
      collectionFilter,
      selectedCoin,
      filteredCoins,
      hasActiveFilters,
      resetFilters
    };
  },
  template: `
    <div class="min-h-screen flex flex-col">
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

      <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-500">
          <div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-sm">Caricamento del catalogo...</p>
        </div>

        <div v-else-if="filteredCoins.length === 0" class="text-center py-20 bg-slate-800/20 border border-dashed border-slate-800 rounded-2xl">
          <h3 class="text-base font-semibold text-slate-300">Nessuna moneta trovata</h3>
          <p class="text-xs text-slate-500 mt-1">Nessun elemento corrisponde ai criteri selezionati.</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          <CoinCard 
            v-for="coin in filteredCoins" 
            :key="coin.id" 
            :coin="coin"
            :ownedCount="ownedTotalsByCoinId[coin.id] || 0"
            :countryName="getCountryName(coin.country)"
            @select="selectedCoin = coin"
          />
        </div>
      </main>

      <CoinModal 
        :coin="selectedCoin" 
        :countryName="selectedCoin ? getCountryName(selectedCoin.country) : ''"
        @close="selectedCoin = null" 
      />
    </div>
  `
};
