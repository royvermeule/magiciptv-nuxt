<script setup lang="ts">
import type { Category, Stream } from "../../../shared/types/stream.types";

definePageMeta({ layout: "hub" });

const { data: categories, status: categoriesStatus } = await useFetch<Category[]>("/api/xtream/movies/categories");

const selectedCategoryId = ref<string | null>(null);

watch(categories, (cats) => {
  if (cats?.length && !selectedCategoryId.value) {
    selectedCategoryId.value = cats[0]?.category_id ?? null;
  }
}, { immediate: true });

const { data: streams, status: streamsStatus } = await useFetch<Stream[]>("/api/xtream/movies/stream", {
  query: { category_id: selectedCategoryId },
  watch: [selectedCategoryId],
});

const searchQuery = ref("");

const { data: allStreams, execute: fetchAllStreams } = await useFetch<Stream[]>("/api/xtream/movies/stream", {
  immediate: false,
  watch: false,
});

const isSearchingAllCategories = computed(() => {
  if (!searchQuery.value)
    return false;
  const term = searchQuery.value.toLowerCase();
  const inCategory = streams.value?.filter(s => s.name.toLowerCase().includes(term)) ?? [];
  return inCategory.length === 0;
});

const filteredStreams = computed(() => {
  if (!searchQuery.value) {
    return streams.value ?? [];
  }

  const term = searchQuery.value.toLowerCase();

  const inCategory = streams.value?.filter(s => s.name.toLowerCase().includes(term)) ?? [];
  if (inCategory.length) {
    return inCategory;
  }

  return allStreams.value?.filter(s => s.name.toLowerCase().includes(term)) ?? [];
});

const { paginatedItems, hasMore, loadMore, resetPage } = usePagination(filteredStreams);

function selectCategory(id: string) {
  selectedCategoryId.value = id;
  searchQuery.value = "";
  resetPage();
}

watch(searchQuery, async (query) => {
  resetPage();
  if (!query)
    return;
  const term = query.toLowerCase();
  const inCategory = streams.value?.filter(s => s.name.toLowerCase().includes(term)) ?? [];
  if (!inCategory.length && !allStreams.value) {
    await fetchAllStreams();
  }
});
</script>

<template>
  <div>
    <div v-if="categoriesStatus === 'pending'" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <template v-else-if="categories?.length">
      <CategoryFilter
        v-model:search="searchQuery"
        :categories="categories"
        :selected-id="selectedCategoryId"
        @select="selectCategory"
      />

      <div v-if="streamsStatus === 'pending'" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg" />
      </div>

      <template v-else>
        <p v-if="isSearchingAllCategories" class="mb-3 text-sm opacity-60">
          Showing results from all categories
        </p>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <StreamCard
            v-for="stream in paginatedItems"
            :key="stream.stream_id"
            :stream-id="stream.stream_id"
            :name="stream.name"
            :icon="stream.stream_icon"
            type="movie"
            fallback-icon="tabler:movie"
          />
        </div>

        <div v-if="hasMore" class="mt-4 flex justify-center">
          <button class="btn btn-outline" @click="loadMore">
            Show more
          </button>
        </div>
      </template>
    </template>
  </div>
</template>
