import { ref, computed } from 'vue';
import { useCollection } from '../composables/useCollection.js';

export default {
  name: 'CoinModal',
  props: {
    coin: { type: Object, required: true },
    countryName: { type: String, default: 'Sconosciuto' }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const { getQuantity, updateCount } = useCollection();

    const mints = computed(() => {
      const c = String(props.coin.country || '').toUpperCase().trim();
      if (['DE', 'DEU', 'GERMANIA'].includes(c)) {
        return [
          { code: 'A', name: 'A - Berlino' },
          { code: 'D', name: 'D - Monaco' },
          { code: 'F', name: 'F - Stoccarda' },
          { code: 'G', name: 'G - Karlsruhe' },
          { code: 'J', name: 'J - Amburgo' }
        ];
      }
      return [{ code: 'STD', name: 'Standard' }];
    });

    const conditions = [
      { id: 'unc', label: 'Circolata / UNC', desc: 'Fior di Conio / Circolata' },
      { id: 'bu', label: 'BU / Coincard', desc: 'Brilliant Uncirculated' },
      { id: 'proof', label: 'Proof / FS', desc: 'Fondo Specchio' }
    ];

    const increment = (mintCode, condId) => {
      updateCount(props.coin.id, mintCode, condId, 1);
    };

    const decrement = (mintCode, condId) => {
      updateCount(props.coin.id, mintCode, condId, -1);
    };

    const totalCoinOwned = computed(() => {
      let total = 0;
      mints.value.forEach(m => {
        conditions.forEach(c => {
          total += getQuantity(props.coin.id, m.code, c.id);
        });
      });
      return total;
    });

    return {
      mints,
      conditions,
      getQuantity,
      increment,
      decrement,
      totalCoinOwned
    };
  },
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-slate-800 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col justify-between overflow-hidden">
        
        <!-- HEADER MODALE -->
        <div class="flex items-start justify-between pb-4 border-b border-slate-700/50">
          <div>
            <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
              {{ countryName }} — {{ coin.year }}
            </span>
            <h2 class="text-lg font-bold text-slate-100 mt-1">{{ coin.title }}</h2>
          </div>
          <button @click="$emit('close')" class="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- CONTENUTO E CONTATORI -->
        <div class="my-4 overflow-y-auto pr-1 space-y-4">
          <div v-for="mint in mints" :key="mint.code" class="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div class="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Zecca: {{ mint.name }}</div>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div v-for="cond in conditions" :key="cond.id" class="bg-slate-800/80 p-3 rounded-lg border border-slate-700/40 flex flex-col justify-between items-center text-center">
                <span class="text-xs font-semibold text-slate-200">{{ cond.label }}</span>
                <span class="text-[10px] text-slate-400 mb-2">{{ cond.desc }}</span>
                
                <div class="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg p-1">
                  <button @click="decrement(mint.code, cond.id)" class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition-colors">
                    -
                  </button>
                  <span class="font-mono font-bold text-sm min-w-[20px] text-emerald-400">
                    {{ getQuantity(coin.id, mint.code, cond.id) }}
                  </span>
                  <button @click="increment(mint.code, cond.id)" class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition-colors">
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="pt-4 border-t border-slate-700/50 flex items-center justify-between">
          <div class="text-sm text-slate-300">
            Totale per questa moneta: <span class="font-bold text-emerald-400">{{ totalCoinOwned }}</span>
          </div>
          <button @click="$emit('close')" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors">
            Fatto
          </button>
        </div>

      </div>
    </div>
  `
};