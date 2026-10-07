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
    const searchFilter = ref('');
    const countryFilter = ref('');
    const yearFilter = ref('');
    const statusFilter = ref('');

    const filteredCoins = computed(() => {
      return coins.value.filter(coin => {
        if (searchFilter.value) {
          const q = searchFilter.value.toLowerCase();
          const matchTitle = (coin.title || '').toLowerCase().includes(q);
          const matchDesc = (coin.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }

        if (countryFilter.value && String(coin.country).toUpperCase() !== String(countryFilter.value).toUpperCase()) {
          return false;
        }

        if (yearFilter.value && String(coin.year) !== String(yearFilter.value)) {
          return false;
        }

        if (statusFilter.value && coin.status !== statusFilter.value) {
          return false;
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
      searchFilter,
      countryFilter,
      yearFilter,
      statusFilter,
      filteredCoins,
      getCountryName,
      availableCountries,
      availableYears,
      ownedTotalsByCoinId,
      openModal,
      closeModal
    };
  },
  template: `
    <div class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <FiltersBar 
        v-model:search="searchFilter"
        v-model:country="countryFilter"
        v-model:year="yearFilter"
        v-model:status="statusFilter"
        :countries="availableCountries"
        :years="availableYears"
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

      <!-- MODALE APERTA SE selectedCoin NON È NULL -->
      <CoinModal 
        v-if="selectedCoin" 
        :coin="selectedCoin" 
        :countryName="getCountryName(selectedCoin.country)"
        @close="closeModal"
      />
    </div>
  `
};