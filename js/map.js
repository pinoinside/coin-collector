import { getCoins, getCountryName } from './catalog.js';
import { getOwnedTotalsByCoinId } from './collection.js';
import { escapeHtml } from './components.js';

let renderVersion = 0;

const EURO_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR',
  'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL',
  'PT', 'SI', 'SK'
]);

function normalizeCountry(value) {
  const code = String(value || '').trim().toUpperCase();

  const aliases = {
    DEU: 'DE',
    GERMANIA: 'DE',
    GREECE: 'GR',
    EL: 'GR',
    SPAIN: 'ES',
    ITA: 'IT',
    ITALY: 'IT',
    FRANCE: 'FR',
    FINLAND: 'FI',
    AUSTRIA: 'AT',
    BELGIUM: 'BE',
    CROATIA: 'HR',
    NETHERLANDS: 'NL',
    PORTUGAL: 'PT',
    SLOVENIA: 'SI',
    SLOVAKIA: 'SK'
  };

  return aliases[code] || code;
}

function progressColor(percentage) {
  const stops = [
    { value: 0, color: [100, 116, 139] },   // ardesia
    { value: 50, color: [15, 118, 110] },   // verde petrolio
    { value: 100, color: [110, 231, 183] }  // verde menta
  ];

  const value = Math.max(0, Math.min(100, percentage));
  const start = value <= 50 ? stops[0] : stops[1];
  const end = value <= 50 ? stops[1] : stops[2];
  const ratio = (value - start.value) / (end.value - start.value);

  const rgb = start.color.map((channel, index) =>
    Math.round(channel + (end.color[index] - channel) * ratio)
  );

  return `rgb(${rgb.join(', ')})`;
}

function getCountryStatistics() {
  const totals = new Map();
  const owned = getOwnedTotalsByCoinId();

  for (const coin of getCoins()) {
    const code = normalizeCountry(coin.country);

    if (!EURO_COUNTRIES.has(code)) continue;

    if (!totals.has(code)) {
      totals.set(code, {
        code,
        total: 0,
        owned: 0
      });
    }

    const stat = totals.get(code);
    stat.total += 1;

    if ((owned[coin.id] || 0) > 0) {
      stat.owned += 1;
    }
  }

  return [...totals.values()]
    .map(item => ({
      ...item,
      percentage: item.total
        ? Math.round((item.owned / item.total) * 100)
        : 0,
      name: getCountryName(item.code)
    }))
    .sort((a, b) =>
      b.percentage - a.percentage ||
      a.name.localeCompare(b.name, 'it')
    );
}

export function renderMap(container) {
  const currentVersion = ++renderVersion;
  const stats = getCountryStatistics();

  container.innerHTML = `
    <div class="map-layout">
        <section class="panel map-panel">
            <div class="map-heading">
                <h2>Europa</h2>
                <button class="button button-secondary" id="map-reset">
                Ripristina mappa
                </button>
            </div>

            <div id="map-canvas" class="map-canvas">
                <div class="loading-state">Caricamento della mappa…</div>
            </div>

            <div class="map-legend">
                <div class="map-legend-labels">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
                <div class="map-legend-gradient"></div>
                <p class="small muted">
                    Percentuale delle emissioni del catalogo possedute
                </p>
            </div>

        </section>

        <section class="panel country-panel">
            <h2>Progressi per paese</h2>

            <div id="country-stat-list" class="country-stat-list">
                ${stats.map(item => `
                <div class="country-stat">
                    <div class="row-between">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span class="small muted">
                        ${item.owned}/${item.total} · ${item.percentage}%
                    </span>
                    </div>

                    <div class="progress">
                        <span
                            style="width:${item.percentage}%;background:${progressColor(item.percentage)}"
                        >
                        </span>
                    </div>
                </div>
                `).join('')}
            </div>
        </section>

    </div>
  `;

  const canvas = container.querySelector('#map-canvas');
  const resetButton = container.querySelector('#map-reset');

  let svgSelection = null;
  let zoomBehavior = null;
  let zoomIdentity = null;

  resetButton.addEventListener('click', () => {
    if (svgSelection && zoomBehavior && zoomIdentity) {
      svgSelection
        .transition()
        .duration(250)
        .call(zoomBehavior.transform, zoomIdentity);
    }
  });

  loadWorldMap(
    canvas,
    stats,
    () => currentVersion === renderVersion
  )
    .then(result => {
      if (currentVersion !== renderVersion || !result) return;

      svgSelection = result.svg;
      zoomBehavior = result.zoom;
      zoomIdentity = result.zoomIdentity;
    })
    .catch(error => {
      console.error('Errore nel caricamento della mappa:', error);

      if (currentVersion !== renderVersion) return;

      canvas.innerHTML = `
        <div class="empty-state">
          <p>La mappa non è disponibile in questo momento.</p>
          <button class="button button-secondary" id="map-retry">
            Riprova
          </button>
        </div>
      `;

      canvas.querySelector('#map-retry')
        ?.addEventListener('click', () => renderMap(container));
    });
}

async function loadWorldMap(canvas, stats, isCurrent) {
  const d3 = await import(
    'https://cdn.jsdelivr.net/npm/d3@7/+esm'
  );

  const topojson = await import(
    'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm'
  );

  if (!isCurrent()) return null;

  const response = await fetch(
    'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'
  );

  if (!response.ok) {
    throw new Error(`Errore cartografia: HTTP ${response.status}`);
  }

  const world = await response.json();

  if (!isCurrent()) return null;

  const width = Math.max(canvas.clientWidth || 700, 320);
  const height = Math.max(360, Math.min(520, width * 0.7));

  canvas.innerHTML = '';
  canvas.style.position = 'relative';

  const svg = d3.select(canvas)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Mappa delle emissioni commemorative europee');

  const projection = d3.geoMercator()
    .center([15, 51])
    .scale(width * 0.65)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath(projection);

  const countries = topojson.feature(
    world,
    world.objects.countries
  ).features;

  const isoNumericToCode = {
    '040': 'AT',
    '056': 'BE',
    '100': 'BG',
    '196': 'CY',
    '276': 'DE',
    '233': 'EE',
    '724': 'ES',
    '246': 'FI',
    '250': 'FR',
    '300': 'GR',
    '191': 'HR',
    '372': 'IE',
    '380': 'IT',
    '440': 'LT',
    '442': 'LU',
    '428': 'LV',
    '470': 'MT',
    '528': 'NL',
    '620': 'PT',
    '705': 'SI',
    '703': 'SK'
  };

  const statByCode = new Map(
    stats.map(item => [item.code, item])
  );

    const color = d3.scaleLinear()
    .domain([0, 50, 100])
    .range(['#64748b', '#0f766e', '#6ee7b7'])
    .clamp(true);

  // Un solo gruppo geografico: lo zoom agisce su tutti i paesi.
  const countryGroup = svg.append('g');

  const tooltip = d3.select(canvas)
    .append('div')
    .style('position', 'absolute')
    .style('display', 'none')
    .style('pointer-events', 'none')
    .style('z-index', '5')
    .style('max-width', '240px')
    .style('padding', '7px 10px')
    .style('border-radius', '7px')
    .style('background', '#020617')
    .style('color', '#f8fafc')
    .style('font-size', '12px');

  countryGroup
    .selectAll('path')
    .data(countries)
    .join('path')
    .attr('d', path)
    .attr('fill', feature => {
    const numeric = String(feature.id).padStart(3, '0');
    const code = isoNumericToCode[numeric];
    const stat = statByCode.get(code);

    // Paesi presenti nel catalogo: colore in base ai progressi.
    // Paesi senza dati nel catalogo: grigio-blu neutro.
    return stat ? color(stat.percentage) : '#263244';
    })
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 0.8)
    .attr('stroke-opacity', 0.85)
    .attr('vector-effect', 'non-scaling-stroke')
    .style('cursor', 'pointer')
    .on('mouseenter', function(event, feature) {
      const numeric = String(feature.id).padStart(3, '0');
      const code = isoNumericToCode[numeric];
      const stat = statByCode.get(code);

      d3.select(this)
        .attr('stroke', '#f8fafc')
        .attr('stroke-width', 1.5);

      if (stat) {
        tooltip
          .style('display', 'block')
          .text(
            `${stat.name}: ${stat.owned}/${stat.total} emissioni (${stat.percentage}%)`
          );
      } else {
        tooltip.style('display', 'none');
      }
    })
    .on('mousemove', event => {
      const bounds = canvas.getBoundingClientRect();

      tooltip
        .style('left', `${event.clientX - bounds.left + 10}px`)
        .style('top', `${event.clientY - bounds.top + 10}px`);
    })
    .on('mouseleave', function() {
      d3.select(this)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 0.8)
        .attr('stroke-opacity', 0.85);

      tooltip.style('display', 'none');
    });

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', event => {
      countryGroup.attr('transform', event.transform);
    });

  svg.call(zoom);

  return {
    svg,
    zoom,
    zoomIdentity: d3.zoomIdentity
  };
}