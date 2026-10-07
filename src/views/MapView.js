import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { useCatalog } from '../composables/useCatalog.js';
import { useCollection } from '../composables/useCollection.js';

export default {
  name: 'MapView',
  setup() {
    const { coins, getCountryName } = useCatalog();
    const { ownedTotalsByCoinId } = useCollection();

    const mapHolder = ref(null);
    const hoveredCountry = ref(null);
    const mapLoading = ref(true);

    let svgSelection = null;
    let gSelection = null;
    let zoomBehavior = null;

    const isoNumericMap = {
      'AT': '040', 'BE': '056', 'CY': '196', 'EE': '233', 'FI': '246',
      'FR': '250', 'DE': '276', 'GR': '300', 'IE': '372', 'IT': '380',
      'LV': '428', 'LT': '440', 'LU': '442', 'MT': '470', 'NL': '528',
      'PT': '620', 'SK': '703', 'SI': '705', 'ES': '724', 'HR': '191',
      'AD': '020', 'MC': '492', 'SM': '674', 'VA': '336'
    };

    const countryStats = computed(() => {
      const map = {};
      coins.value.forEach(coin => {
        const code = coin.country;
        if (!code || code === 'EU') return;

        if (!map[code]) {
          map[code] = { code, name: getCountryName(code), total: 0, owned: 0 };
        }
        map[code].total += 1;
        if ((ownedTotalsByCoinId.value[coin.id] || 0) > 0) {
          map[code].owned += 1;
        }
      });

      return Object.values(map)
        .map(stat => ({
          ...stat,
          percentage: stat.total > 0 ? Math.round((stat.owned / stat.total) * 100) : 0
        }))
        .sort((a, b) => b.percentage - a.percentage || a.name.localeCompare(b.name, 'it'));
    });

    // Mappa veloce ISO numerico -> Dati reattivi
    const statsByNumericIso = computed(() => {
      const map = {};
      countryStats.value.forEach(s => {
        const numIso = isoNumericMap[s.code];
        if (numIso) map[numIso] = s;
      });
      return map;
    });

    const updateMapColors = () => {
      if (!gSelection) return;

      const colorScale = d3.scaleSequential()
        .domain([0, 100])
        .interpolator(d3.interpolateRgb("#334155", "#10b981"));

      gSelection.selectAll("path")
        .transition()
        .duration(300)
        .attr("fill", d => {
          const stat = statsByNumericIso.value[d.id];
          return stat ? colorScale(stat.percentage) : "#1e293b";
        });
    };

    const renderMap = async () => {
      const container = mapHolder.value;
      if (!container) return;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const width = Math.max(container.clientWidth || 0, 700);
      const height = Math.max(container.clientHeight || 0, 500);

      svgSelection = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

      gSelection = svgSelection.append("g");

      zoomBehavior = d3.zoom()
        .scaleExtent([0.8, 12])
        .translateExtent([[ -width, -height ], [ width * 2, height * 2 ]])
        .on("zoom", (event) => {
          if (gSelection) gSelection.attr("transform", event.transform);
        });

      svgSelection.call(zoomBehavior);

      try {
        const topoData = await d3.json("https://unpkg.com/world-atlas@2.0.2/countries-50m.json");
        const countries = topojson.feature(topoData, topoData.objects.countries).features;

        const projection = d3.geoMercator()
          .center([13, 52.5])
          .scale(Math.min(width, height) * 1.3)
          .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        const colorScale = d3.scaleSequential()
          .domain([0, 100])
          .interpolator(d3.interpolateRgb("#334155", "#10b981"));

        gSelection.selectAll("path")
          .data(countries)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("class", "country-shape transition-colors cursor-pointer")
          .attr("fill", d => {
            const stat = statsByNumericIso.value[d.id];
            return stat ? colorScale(stat.percentage) : "#1e293b";
          })
          .attr("stroke", "#475569")
          .attr("stroke-width", "0.5px")
          .on("mouseover", (event, d) => {
            const stat = statsByNumericIso.value[d.id];
            if (stat) hoveredCountry.value = stat;
          })
          .on("mouseleave", () => {
            hoveredCountry.value = null;
          });

      } catch (err) {
        console.error("Errore durante il caricamento o rendering della mappa:", err);
      } finally {
        mapLoading.value = false;
      }
    };

    const resetZoom = () => {
      if (svgSelection && zoomBehavior) {
        svgSelection.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity);
      }
    };

    // Reattività: aggiorna i colori se i dati delle monete o della collezione cambiano
    watch([coins, ownedTotalsByCoinId], () => {
      updateMapColors();
    }, { deep: true });

    onMounted(() => {
      nextTick(() => {
        setTimeout(() => {
          renderMap();
        }, 100);
      });
    });

    onUnmounted(() => {
      svgSelection = null;
      gSelection = null;
      zoomBehavior = null;
    });

    return {
      mapHolder,
      hoveredCountry,
      mapLoading,
      countryStats,
      resetZoom
    };
  },
  template: `
    <div class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
      
      <!-- MAP CONTAINER -->
      <div class="flex-1 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between relative shadow-xl min-h-[550px] overflow-hidden">
        
        <!-- CONTROLLO RESET ZOOM -->
        <div class="absolute top-6 right-6 z-10 flex flex-col gap-2">
          <button 
            @click="resetZoom" 
            title="Ripristina posizione e zoom" 
            class="p-2.5 bg-slate-900/80 hover:bg-slate-900 backdrop-blur border border-slate-700 text-slate-200 rounded-xl shadow-lg transition-colors flex items-center justify-center"
          >
            <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
            </svg>
          </button>
        </div>

        <!-- TOOLTIP DINAMICO -->
        <div 
          v-show="hoveredCountry" 
          class="absolute top-6 left-6 z-10 bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-2xl pointer-events-none space-y-1 min-w-[180px]"
        >
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ hoveredCountry ? hoveredCountry.name : '' }}</div>
          <div class="text-lg font-extrabold text-indigo-400">{{ hoveredCountry ? hoveredCountry.percentage : 0 }}%</div>
          <div class="text-xs text-slate-300">
            <span class="font-semibold text-emerald-400">{{ hoveredCountry ? hoveredCountry.owned : 0 }}</span> / {{ hoveredCountry ? hoveredCountry.total : 0 }} monete possedute
          </div>
        </div>

        <!-- OVERLAY CARICAMENTO -->
        <div v-if="mapLoading" class="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center text-slate-400 text-xs gap-2">
          <div class="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div> Caricamento mappa...
        </div>

        <!-- SVG HOLDER CON v-once -->
        <div v-once ref="mapHolder" class="w-full h-full flex-1 flex items-center justify-center relative overflow-hidden cursor-grab active:cursor-grabbing min-h-[450px]"></div>

        <!-- LEGENDA -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 pt-3 border-t border-slate-700/40 z-10 bg-slate-800/30 -mx-4 -mb-4 px-4 pb-3">
          <span class="text-[11px] text-slate-500 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
            </svg> Trascina per spostare, rotella per zoomare
          </span>
          <div class="flex items-center gap-2">
            <span>0%</span>
            <div class="h-3 w-36 rounded-full bg-gradient-to-r from-slate-700 via-indigo-600 to-emerald-500"></div>
            <span>100%</span>
          </div>
        </div>
      </div>

      <!-- TABELLA DETTAGLIO PAESI -->
      <div class="w-full lg:w-80 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col max-h-[600px] shadow-xl">
        <h2 class="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
          </svg> Dettaglio per Paese
        </h2>

        <div class="overflow-y-auto pr-1 flex-1 space-y-2">
          <div 
            v-for="stat in countryStats" 
            :key="stat.code"
            @mouseenter="hoveredCountry = stat"
            @mouseleave="hoveredCountry = null"
            class="bg-slate-900/60 border border-slate-700/40 hover:border-indigo-500/50 p-2.5 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer"
          >
            <div>
              <div class="font-bold text-slate-200">{{ stat.name }}</div>
              <div class="text-[11px] text-slate-400">{{ stat.owned }} / {{ stat.total }} monete</div>
            </div>
            
            <div class="text-right">
              <span class="font-mono font-bold text-sm" :class="stat.percentage === 100 ? 'text-emerald-400' : 'text-indigo-300'">
                {{ stat.percentage }}%
              </span>
              <div class="w-16 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                <div class="bg-indigo-500 h-full rounded-full" :style="{ width: stat.percentage + '%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
};
// test