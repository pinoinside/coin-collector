import { computed } from 'vue';
import { useCollection } from '../composables/useCollection.js';

export default {
  name: 'CoinModal',
  props: {
    coin: { type: Object, required: true },
    countryName: { type: String, default: 'Sconosciuto' }
  },
  emits: ['close'],
  setup(props) {
    const { getCoinData, updateQuantity, updateNotes } = useCollection();

    const coinData = computed(() => getCoinData(props.coin.id));

    const totalOwned = computed(() => {
      const d = coinData.value;
      return Number(d.fdc || 0) + Number(d.circ || 0) + Number(d.proof || 0) + Number(d.reverse || 0);
    });

    const formatMintage = (m) => {
      if (!m || m === 0) return 'Non nota / TBA';
      return new Intl.NumberFormat('it-IT').format(m) + ' esemplari';
    };

    const handleNotesInput = (e) => {
      updateNotes(props.coin.id, e.target.value);
    };

    return {
      coinData,
      totalOwned,
      formatMintage,
      updateQuantity,
      handleNotesInput
    };
  },
  template: `
    <teleport to="body">
      <div class="fixed -top-12 -left-12 w-[calc(100vw+6rem)] h-[calc(100vh+6rem)] z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto m-0 p-0" @click.self="$emit('close')">
        <div class="bg-slate-800 border border-slate-700/80 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] flex flex-col justify-between overflow-hidden">
          
          <!-- HEADER MODALE -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-700/60">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {{ countryName }}
              </span>
              <span class="text-xs font-mono font-bold text-slate-400">
                Anno {{ coin.year }}
              </span>
            </div>

            <button @click="$emit('close')" class="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-700/50 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- CORPO A 2 COLONNE -->
          <div class="my-4 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- COLONNA SINISTRA: FOTO E DETTAGLI STORICI -->
            <div class="space-y-4 flex flex-col justify-between">
              <div class="text-center">
                <h2 class="text-base font-bold text-slate-100 mb-3">{{ coin.title }}</h2>
                
                <!-- IMMAGINE INGRANDITA CON SFONDO TRASPARENTE -->
                <div class="w-48 h-48 mx-auto relative flex items-center justify-center bg-white rounded-full p-3 border-4 border-indigo-500/30 shadow-2xl overflow-hidden">
                  <img 
                    v-if="coin.image_url" 
                    :src="coin.image_url" 
                    :alt="coin.title" 
                    class="max-h-full max-w-full object-contain hover:scale-110 transition-transform duration-300"
                  />
                  <div v-else class="text-slate-500 text-xs">Immagine non disponibile</div>
                </div>
              </div>

              <!-- SCHEDA TECNICA -->
              <div class="bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/40 text-xs space-y-2">
                <div class="flex justify-between">
                  <span class="text-slate-400">Tiratura:</span>
                  <span class="font-semibold text-slate-200">{{ formatMintage(coin.mintage) }}</span>
                </div>
                <div v-if="coin.designer" class="flex justify-between">
                  <span class="text-slate-400">Incisore / Autore:</span>
                  <span class="font-semibold text-slate-200">{{ coin.designer }}</span>
                </div>
                <div v-if="coin.issue_date" class="flex justify-between">
                  <span class="text-slate-400">Data Emissione:</span>
                  <span class="font-semibold text-slate-200">{{ coin.issue_date }}</span>
                </div>
              </div>

              <!-- DESCRIZIONE -->
              <div v-if="coin.description" class="bg-slate-900/30 p-3.5 rounded-xl border border-slate-700/30 text-xs text-slate-300 max-h-32 overflow-y-auto leading-relaxed">
                <span class="font-bold text-slate-400 block mb-1">Descrizione:</span>
                {{ coin.description }}
              </div>
            </div>

            <!-- COLONNA DESTRA: INVENTARIO STATI & VARIANTI -->
            <div class="space-y-4">
              <h3 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                <span>Stato di Conservazione</span>
                <span v-if="totalOwned > 0" class="text-emerald-400 font-extrabold normal-case">
                  {{ totalOwned }} pezzi in collezione
                </span>
              </h3>

              <!-- CONTATORI STATI -->
              <div class="space-y-2.5">
                
                <!-- 1. FDC / Nuova -->
                <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <div class="text-xs font-bold text-slate-200">Fior di Conio / Nuova</div>
                    <div class="text-[11px] text-slate-400">Da rotolino / FDC / UNC</div>
                  </div>
                  <div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
                    <button @click="updateQuantity(coin.id, 'fdc', -1)" class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold">-</button>
                    <span class="font-mono font-bold text-xs min-w-[20px] text-center text-emerald-400">{{ coinData.fdc || 0 }}</span>
                    <button @click="updateQuantity(coin.id, 'fdc', 1)" class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold">+</button>
                  </div>
                </div>

                <!-- 2. Usata / Viaggiata -->
                <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <div class="text-xs font-bold text-slate-200">Usata / Viaggiata</div>
                    <div class="text-[11px] text-slate-400">Circolata / Trovata nel resto</div>
                  </div>
                  <div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
                    <button @click="updateQuantity(coin.id, 'circ', -1)" class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold">-</button>
                    <span class="font-mono font-bold text-xs min-w-[20px] text-center text-emerald-400">{{ coinData.circ || 0 }}</span>
                    <button @click="updateQuantity(coin.id, 'circ', 1)" class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold">+</button>
                  </div>
                </div>

                <!-- 3. Proof / Astuccio -->
                <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <div class="text-xs font-bold text-slate-200">Proof / Astuccio</div>
                    <div class="text-[11px] text-slate-400">Fondo Specchio / FS</div>
                  </div>
                  <div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
                    <button @click="updateQuantity(coin.id, 'proof', -1)" class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold">-</button>
                    <span class="font-mono font-bold text-xs min-w-[20px] text-center text-emerald-400">{{ coinData.proof || 0 }}</span>
                    <button @click="updateQuantity(coin.id, 'proof', 1)" class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold">+</button>
                  </div>
                </div>

                <!-- 4. Coincard / Reverse -->
                <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between">
                  <div>
                    <div class="text-xs font-bold text-slate-200">Coincard / Reverse</div>
                    <div class="text-[11px] text-slate-400">Versione Speciale / Reverse Proof</div>
                  </div>
                  <div class="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
                    <button @click="updateQuantity(coin.id, 'reverse', -1)" class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold">-</button>
                    <span class="font-mono font-bold text-xs min-w-[20px] text-center text-emerald-400">{{ coinData.reverse || 0 }}</span>
                    <button @click="updateQuantity(coin.id, 'reverse', 1)" class="w-7 h-7 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold">+</button>
                  </div>
                </div>

              </div>

              <!-- CAMPO TESTO LIBERO NOTE / VARIANTI -->
              <div class="pt-2">
                <label class="block text-xs font-bold text-slate-300 mb-1.5">
                  Note, Varianti o Errori di Conio:
                </label>
                <textarea 
                  :value="coinData.notes || ''"
                  @input="handleNotesInput"
                  placeholder="Es. Zecca G (Karlsruhe), Asse ruotato, Conio stanco..." 
                  rows="3"
                  class="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                ></textarea>
              </div>

            </div>

          </div>

          <!-- FOOTER -->
          <div class="pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <div class="text-xs text-slate-400">
              Stato salvato automaticamente
            </div>
            <button @click="$emit('close')" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg">
              Chiudi
            </button>
          </div>

        </div>
      </div>
    </teleport>
  `
};