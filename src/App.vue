<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased">
    <Header />
    <router-view class="flex-1" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import Header from '@/components/Header.vue';
import { useCatalog } from '@/composables/useCatalog';
import { useCollection } from '@/composables/useCollection';

const { fetchCoins } = useCatalog();
const { loadCollection } = useCollection();

onMounted(() => {
  loadCollection();
  fetchCoins();
});
</script>
