import { onMounted } from 'vue';
import Header from './components/Header.js';
import { useCatalog } from './composables/useCatalog.js';

export default {
  name: 'App',
  components: { Header },
  setup() {
    const { fetchCoins } = useCatalog();

    onMounted(() => {
      fetchCoins();
    });

    return {};
  },
  template: `
    <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      <Header />
      <main class="flex-1 flex flex-col">
        <router-view />
      </main>
    </div>
  `
};