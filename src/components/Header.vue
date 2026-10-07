<template>
  <header class="bg-slate-800/80 backdrop-blur border-b border-slate-700/60 sticky top-0 z-30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      
      <!-- LOGO / TITOLO -->
      <div class="flex items-center space-x-3">
        <div class="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
          <Coins class="w-7 h-7" />
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white">2€ Commemorativi</h1>
          <p class="text-xs text-slate-400">Gestione collezione e catalogo dell'Eurozona</p>
        </div>
      </div>

      <!-- LINK E CONTROLLI -->
      <div class="flex flex-wrap items-center gap-3 text-xs font-medium">
        
        <!-- NAVIGAZIONE ROUTER -->
        <router-link 
          to="/" 
          class="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors"
          :class="isCatalogRoute ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'"
        >
          <List class="w-3.5 h-3.5" /> Catalogo
        </router-link>

        <router-link 
          to="/map" 
          class="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors"
          :class="isMapRoute ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'"
        >

<Map class="w-3.5 h-3.5" />
Mappa
        </router-link>

        <!-- PULSANTI IMPORT / EXPORT -->
        <div class="flex items-center space-x-2 border-l border-slate-700 pl-3">
          <button 
            @click="exportCollection" 
            title="Esporta la tua collezione in JSON"
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download class="w-3.5 h-3.5 text-indigo-400" /> Esporta
          </button>
          
          <button 
            @click="triggerFileInput" 
            title="Importa la collezione da un file JSON"
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Upload class="w-3.5 h-3.5 text-emerald-400" /> Importa
          </button>
          <input type="file" ref="fileInput" @change="handleImport" accept=".json" class="hidden" />
        </div>

        <!-- KPI BADGE -->
        <div class="bg-slate-900/60 border border-slate-700/50 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span class="text-slate-400">Possedute:</span>
          <span class="text-emerald-400 font-bold text-sm">{{ totalOwnedPieces }}</span>
          <span class="text-slate-500">pezzi</span>
        </div>

      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Coins, List, Map, Download, Upload } from 'lucide-vue-next';
import { useCollection } from '@/composables/useCollection';

const route = useRoute();
const fileInput = ref(null);
const { totalOwnedPieces, exportCollection, importCollectionData } = useCollection();

const isCatalogRoute = computed(() => route.path === '/');
const isMapRoute = computed(() => route.path === '/map');

const triggerFileInput = () => {
  if (fileInput.value) fileInput.value.click();
};

const handleImport = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (confirm("Attenzione: questa operazione sovrascriverà la collezione attuale. Continuare?")) {
        const result = importCollectionData(data);
        if (result.success) {
          alert("Collezione importata con successo!");
        } else {
          alert("Errore nell'importazione: " + result.reason);
        }
      }
    } catch (err) {
      alert("File JSON non valido: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};
</script>
