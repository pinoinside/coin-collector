<template>
  <section class="bg-slate-800/40 border-b border-slate-800 py-4">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        
        <!-- RICERCA TESTUALE -->
        <div class="relative lg:col-span-2">
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            :value="searchQuery" 
            @input="$emit('update:searchQuery', $event.target.value)"
            type="text" 
            placeholder="Cerca per titolo o descrizione..." 
            class="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <!-- FILTRO POSSESSO -->
        <div>
          <select 
            :value="collectionFilter" 
            @change="$emit('update:collectionFilter', $event.target.value)"
            class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="all">Tutti i pezzi</option>
            <option value="owned">Solo in Collezione</option>
            <option value="missing">Mancanti</option>
          </select>
        </div>

        <!-- FILTRO PAESE -->
        <div>
          <select 
            :value="selectedCountry" 
            @change="$emit('update:selectedCountry', $event.target.value)"
            class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">Tutti i Paesi ({{ countries.length }})</option>
            <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }}</option>
          </select>
        </div>

        <!-- FILTRO ANNO -->
        <div>
          <select 
            :value="selectedYear" 
            @change="$emit('update:selectedYear', $event.target.value)"
            class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">Tutti gli Anni</option>
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>

        <!-- FILTRO STATO EMISSIONE -->
        <div>
          <select 
            :value="selectedStatus" 
            @change="$emit('update:selectedStatus', $event.target.value)"
            class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">Tutte</option>
            <option value="issued">Emesse</option>
            <option value="announced">Annunciate</option>
          </select>
        </div>

      </div>

      <!-- RESET FILTRI -->
      <div v-if="hasActiveFilters" class="flex justify-end">
        <button @click="$emit('reset')" class="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors">
          <RotateCcw class="w-3 h-3" /> Ripristina Filtri
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Search, RotateCcw } from 'lucide-vue-next';

defineProps({
  searchQuery: String,
  collectionFilter: String,
  selectedCountry: String,
  selectedYear: [String, Number],
  selectedStatus: String,
  countries: Array,
  years: Array,
  hasActiveFilters: Boolean
});

defineEmits([
  'update:searchQuery',
  'update:collectionFilter',
  'update:selectedCountry',
  'update:selectedYear',
  'update:selectedStatus',
  'reset'
]);
</script>
