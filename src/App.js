import { onMounted } from 'vue';
import Header from './components/Header.js';
import { useCatalog } from './composables/useCatalog.js';
import { useCollection } from './composables/useCollection.js';

export default {
  name: 'App',
  components: {
    Header
  },
  setup() {
    const { fetchCoins } = useCatalog();
    const { loadCollection } = useCollection();

    onMounted(() => {
      loadCollection();
      fetchCoins();
    });
  },
  template: `
    <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
      <Header />
      <router-view class="flex-1"></router-view>
    </div>
  `
};
