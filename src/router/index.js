import { createRouter, createWebHistory } from 'vue-router';
import CatalogView from '@/views/CatalogView.vue';
import MapView from '@/views/MapView.vue';

const routes = [
  { path: '/', name: 'Catalog', component: CatalogView },
  { path: '/map', name: 'Map', component: MapView }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
