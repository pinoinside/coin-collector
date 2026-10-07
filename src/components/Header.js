import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useCollection } from '../composables/useCollection.js';

export default {
  name: 'Header',
  setup() {
    const route = useRoute();
    const fileInput = ref(null);
    const { totalOwnedPieces, exportCollection, importCollectionData } = useCollection();

    const isCatalogRoute = computed(() => route.path === '/' || route.path === '');
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

    return {
      fileInput,
      totalOwnedPieces,
      exportCollection,
      isCatalogRoute,
      isMapRoute,
      triggerFileInput,
      handleImport
    };
  },
  template: `
    <header class="bg-slate-800/80 backdrop-blur border-b border-slate-700/60 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        <!-- LOGO / TITOLO -->
        <div class="flex items-center space-x-3">
          <div class="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="8" cy="8" r="6" stroke-width="2"></circle>
              <circle cx="16" cy="16" r="6" stroke-width="2"></circle>
            </svg>
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
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
            </svg> Catalogo
          </router-link>

          <router-link 
            to="/map" 
            class="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors"
            :class="isMapRoute ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
            </svg> Mappa
          </router-link>

          <!-- PULSANTI IMPORT / EXPORT -->
          <div class="flex items-center space-x-2 border-l border-slate-700 pl-3">
            <button 
              @click="exportCollection" 
              title="Esporta la tua collezione in JSON"
              class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg> Esporta
            </button>
            
            <button 
              @click="triggerFileInput" 
              title="Importa la collezione da un file JSON"
              class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg> Importa
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
  `
};
