<script setup lang="ts">
import type { Category, Stream } from "../../../../shared/types/stream.types";

definePageMeta({ layout: "hub" });

const { data: categories, status: categoriesStatus } = await useFetch<Category[]>("/api/xtream/series/categories");
const { data: allStreams, status: streamsStatus } = await useFetch<Stream[]>("/api/xtream/series/stream");

const selectedCategoryId = ref<string | null>(null);

watch(categories, (cats) => {
  if (cats?.length && !selectedCategoryId.value) {
    selectedCategoryId.value = cats[0]?.category_id ?? null;
  }
}, { immediate: true });

const streams = computed(() => {
  if (!allStreams.value) {
    return [];
  }
  if (!selectedCategoryId.value) {
    return allStreams.value;
  }
  return allStreams.value.filter(s => s.category_id === selectedCategoryId.value);
});

const searchQuery = ref("");

const filteredStreams = computed(() => {
  if (!searchQuery.value) {
    return streams.value;
  }

  const term = searchQuery.value.toLowerCase();
  const inCategory = streams.value.filter(s => s.name.toLowerCase().includes(term));

  if (inCategory.length) {
    return inCategory;
  }

  return allStreams.value?.filter(s => s.name.toLowerCase().includes(term)) ?? [];
});

const isSearchingAllCategories = computed(() => {
  if (!searchQuery.value) {
    return false;
  }
  const term = searchQuery.value.toLowerCase();
  const inCategory = streams.value.filter(s => s.name.toLowerCase().includes(term));
  return inCategory.length === 0;
});

function selectCategory(id: string) {
  selectedCategoryId.value = id;
  searchQuery.value = "";
}
</script>

<template>
  <div>
    <div v-if="categoriesStatus === 'pending' || streamsStatus === 'pending'" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <template v-else-if="categories?.length">
      <CategoryFilter
        v-model:search="searchQuery"
        :categories="categories"
        :selected-id="selectedCategoryId"
        @select="selectCategory"
      />

      <template v-if="filteredStreams.length">
        <p v-if="isSearchingAllCategories" class="mb-3 text-sm opacity-60">
          Showing results from all categories
        </p>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <StreamCard
            v-for="stream in filteredStreams"
            :key="stream.series_id ?? stream.stream_id"
            :stream-id="stream.series_id ?? stream.stream_id"
            :name="stream.name"
            :icon="stream.cover ?? stream.stream_icon"
            type="series"
            fallback-icon="tabler:device-tv"
          />
        </div>
      </template>
    </template>
  </div>
</template>
