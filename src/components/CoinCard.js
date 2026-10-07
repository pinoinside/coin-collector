import { computed } from 'vue';

export default {
  name: 'CoinCard',
  props: {
    coin: { type: Object, required: true },
    ownedCount: { type: Number, default: 0 },
    countryName: { type: String, default: 'Sconosciuto' }
  },
  emits: ['select'],
  setup(props) {
    const isGermany = computed(() => {
      const c = String(props.coin.country || '').toUpperCase().trim();
      return c === 'DE' || c === 'DEU' || c === 'GERMANIA';
    });

    return {
      isGermany
    };
  },
  template: `
    <div 
      @click="$emit('select', coin)"
      class="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg relative overflow-hidden"
    >
      <!-- BADGE COLLEZIONE SE POSSEDUTA -->
      <div v-if="ownedCount > 0" class="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 shadow">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
        </svg>
        {{ ownedCount }}
      </div>

      <div>
        <div class="flex items-center justify-between mb-3 text-xs pr-6">
          <span class="font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-200 border border-slate-600">
            {{ countryName }}
          </span>
          <span v-if="isGermany" class="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
            5 Zecche
          </span>
        </div>

        <!-- IMMAGINE LOCALE -->
        <div class="w-32 h-32 mx-auto my-3 relative flex items-center justify-center bg-slate-200/90 rounded-full p-1 border border-slate-600/30 shadow-inner">
          <img 
            v-if="coin.image_url" 
            :src="coin.image_url" 
            :alt="coin.title" 
            class="max-h-full max-w-full object-contain coin-img-blend group-hover:scale-105 transition-transform duration-300" 
            loading="lazy" 
          />
          <div v-else class="w-full h-full rounded-full bg-slate-700/40 flex items-center justify-center text-slate-500">
            <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke-width="2"></circle>
              <circle cx="12" cy="12" r="3" stroke-width="2"></circle>
            </svg>
          </div>
        </div>

        <h2 class="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 line-clamp-2 transition-colors mb-1" :title="coin.title">
          {{ coin.title }}
        </h2>
      </div>

      <div class="pt-3 border-t border-slate-700/40 mt-3 flex items-center justify-between text-xs text-slate-400">
        <span class="font-mono font-medium">{{ coin.year }}</span>
        <span class="text-[11px] text-indigo-400 group-hover:underline flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Gestisci
        </span>
      </div>
    </div>
  `
};
