<script setup lang="ts">
definePageMeta({ layout: "hub" });

const { liveCategories, liveStreams } = useIptvData();

const selectedCategoryId = ref<string | null>(null);

watch(liveCategories, (cats) => {
  if (cats.length && !selectedCategoryId.value) {
    selectedCategoryId.value = cats[0]?.category_id ?? null;
  }
}, { immediate: true });

const streams = computed(() => {
  if (!selectedCategoryId.value)
    return liveStreams.value;
  return liveStreams.value.filter(s => s.category_id === selectedCategoryId.value);
});

const searchQuery = ref("");

const isSearchingAllCategories = computed(() => {
  if (!searchQuery.value)
    return false;
  const term = searchQuery.value.toLowerCase();
  return streams.value.filter(s => s.name.toLowerCase().includes(term)).length === 0;
});

const filteredStreams = computed(() => {
  if (!searchQuery.value)
    return streams.value;

  const term = searchQuery.value.toLowerCase();
  const inCategory = streams.value.filter(s => s.name.toLowerCase().includes(term));

  if (inCategory.length)
    return inCategory;

  return liveStreams.value.filter(s => s.name.toLowerCase().includes(term));
});

const { paginatedItems, hasMore, loadMore, resetPage } = usePagination(filteredStreams);

function selectCategory(id: string) {
  selectedCategoryId.value = id;
  searchQuery.value = "";
  resetPage();
}

watch(searchQuery, () => resetPage());
</script>

<template>
  <div>
    <template v-if="liveCategories.length">
      <CategoryFilter
        v-model:search="searchQuery"
        :categories="liveCategories"
        :selected-id="selectedCategoryId"
        @select="selectCategory"
      />

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
          type="live"
          fallback-icon="tabler:antenna"
        />
      </div>

      <div v-if="hasMore" class="mt-4 flex justify-center">
        <button class="btn btn-outline" @click="loadMore">
          Show more
        </button>
      </div>
    </template>
  </div>
</template>
