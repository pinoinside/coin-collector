import { createRouter, createWebHistory } from 'vue-router';
import CatalogView from '../views/CatalogView.js';
import MapView from '../views/MapView.js';

const routes = [
  { path: '/', name: 'Catalog', component: CatalogView },
  { path: '/map', name: 'Map', component: MapView }
];

export const router = createRouter({
  history: createWebHistory('/coin-collector/'), // Imposta la base url per GitHub Pages
  routes
});
