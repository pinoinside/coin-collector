<template>
  <div v-if="coin" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
      
      <button @click="$emit('close')" class="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors">
        <X class="w-5 h-5" />
      </button>

      <div class="flex items-center space-x-3 mb-2">
        <span class="font-bold px-2.5 py-1 rounded bg-slate-700 text-slate-200 border border-slate-600 text-xs">
          {{ countryName }}
        </span>
        <span class="text-sm font-semibold text-indigo-400 font-mono">{{ coin.year }}</span>
      </div>

      <h3 class="text-lg font-bold text-white mb-4 pr-6">{{ coin.title }}</h3>

      <div class="overflow-y-auto pr-1 space-y-6">
        
        <!-- SEZIONE GESTIONE INVENTARIO -->
        <div class="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4">
          <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
            <Box class="w-4 h-4" /> Pezzi Posseduti in Collezione
          </h4>

          <!-- GERMANIA: 5 ZECCE -->
          <div v-if="isGermany" class="space-y-4">
            <div v-for="mint in germanMints" :key="mint.code" class="bg-slate-800/80 p-3 rounded-lg border border-slate-700/50">
              <div class="text-xs font-bold text-amber-400 mb-2 flex items-center justify-between">
                <span>Zecca {{ mint.code }} - {{ mint.city }}</span>
                <span class="text-slate-400 text-[11px]">Totale: {{ getMintTotal(coin.id, mint.code) }}</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div v-for="type in conditionTypes" :key="type.id" class="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-700/40 text-xs">
                  <span class="text-slate-300 font-medium">{{ type.label }}</span>
                  <div class="flex items-center space-x-1.5">
                    <button @click="updateCount(coin.id, mint.code, type.id, -1)" class="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold">-</button>
                    <span class="w-5 text-center font-mono font-bold text-indigo-300">{{ getQuantity(coin.id, mint.code, type.id) }}</span>
                    <button @click="updateCount(coin.id, mint.code, type.id, 1)" class="w-5 h-5 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-bold">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ALTRI PAESI: ZECCA UNICA (STD) -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="type in conditionTypes" :key="type.id" class="flex items-center justify-between bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700/50 text-xs">
              <span class="text-slate-300 font-medium">{{ type.label }}</span>
              <div class="flex items-center space-x-2">
                <button @click="updateCount(coin.id, 'STD', type.id, -1)" class="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded font-bold">-</button>
                <span class="w-6 text-center font-mono font-bold text-indigo-300 text-sm">{{ getQuantity(coin.id, 'STD', type.id) }}</span>
                <button @click="updateCount(coin.id, 'STD', type.id, 1)" class="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white rounded font-bold">+</button>
              </div>
            </div>
          </div>
        </div>

        <!-- DETTAGLI TECNICI -->
        <div class="space-y-3">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div class="bg-slate-900/40 p-2.5 rounded border border-slate-700/40">
              <span class="block text-slate-500 mb-0.5">Tiratura</span>
              <span class="font-semibold text-slate-200">{{ coin.mintage > 0 ? formatNumber(coin.mintage) + ' pz' : 'N/D' }}</span>
            </div>
            <div class="bg-slate-900/40 p-2.5 rounded border border-slate-700/40">
              <span class="block text-slate-500 mb-0.5">Emissione</span>
              <span class="font-semibold text-slate-200">{{ coin.issue_date || 'N/D' }}</span>
            </div>
            <div class="bg-slate-900/40 p-2.5 rounded border border-slate-700/40 col-span-2 sm:col-span-1">
              <span class="block text-slate-500 mb-0.5">Incisore/Disegnatore</span>
              <span class="font-semibold text-slate-200 truncate block" :title="coin.designer">{{ coin.designer || 'N/D' }}</span>
            </div>
          </div>

          <div v-if="coin.description" class="text-xs text-slate-300 bg-slate-900/30 p-3 rounded-lg border border-slate-700/30 leading-relaxed">
            <span class="font-semibold text-slate-400 block mb-1">Descrizione:</span>
            <p>{{ coin.description }}</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { X, Box } from 'lucide-vue-next';
import { useCollection } from '@/composables/useCollection';

const props = defineProps({
  coin: Object,
  countryName: String
});

defineEmits(['close']);

const { getQuantity, getMintTotal, updateCount } = useCollection();

const isGermany = computed(() => {
  const c = String(props.coin?.country || '').toUpperCase().trim();
  return c === 'DE' || c === 'DEU' || c === 'GERMANIA';
});

const germanMints = [
  { code: 'A', city: 'Berlino' },
  { code: 'D', city: 'Monaco' },
  { code: 'F', city: 'Stoccarda' },
  { code: 'G', city: 'Karlsruhe' },
  { code: 'J', city: 'Amburgo' }
];

const conditionTypes = [
  { id: 'used', label: 'Usata / Circolata' },
  { id: 'unc', label: 'UNC / Fior di Conio' },
  { id: 'proof', label: 'Proof / FDC' },
  { id: 'coincard', label: 'Coincard / Blister' }
];

const formatNumber = (num) => new Intl.NumberFormat('it-IT').format(num || 0);
</script>
