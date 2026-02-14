<script setup lang="ts">
definePageMeta({ layout: "hub" });

type LiveCategory = {
  category_id: string;
  category_name: string;
  parent_id: number;
};

type LiveStream = {
  stream_id: number;
  name: string;
  stream_icon: string;
  category_id: string;
};

const { data: categories, status: categoriesStatus } = await useFetch<LiveCategory[]>("/api/xtream/live/categories");

const selectedCategoryId = ref<string | null>(null);

watch(categories, (cats) => {
  if (cats?.length && !selectedCategoryId.value) {
    selectedCategoryId.value = cats[0]?.category_id ?? null;
  }
}, { immediate: true });

const { data: streams, status: streamsStatus } = await useFetch<LiveStream[]>("/api/xtream/live/stream", {
  query: { category_id: selectedCategoryId },
  watch: [selectedCategoryId],
});

const searchQuery = ref("");

const { data: allStreams, execute: fetchAllStreams } = await useFetch<LiveStream[]>("/api/xtream/live/stream", {
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
  if (!searchQuery.value)
    return streams.value;

  const term = searchQuery.value.toLowerCase();

  const inCategory = streams.value?.filter(s => s.name.toLowerCase().includes(term)) ?? [];
  if (inCategory.length)
    return inCategory;

  return allStreams.value?.filter(s => s.name.toLowerCase().includes(term)) ?? [];
});

function selectCategory(id: string) {
  selectedCategoryId.value = id;
  searchQuery.value = "";
}

watch(searchQuery, async (query) => {
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
          <div
            v-for="stream in filteredStreams"
            :key="stream.stream_id"
            class="card bg-base-100 cursor-pointer shadow-sm transition-shadow hover:shadow-md"
          >
            <figure class="bg-base-200 px-4 pt-4">
              <img
                v-if="stream.stream_icon"
                :src="stream.stream_icon"
                :alt="stream.name"
                class="h-16 w-16 rounded object-contain"
              >
              <Icon v-else name="tabler:antenna" size="40" class="text-base-content/30" />
            </figure>
            <div class="card-body p-3">
              <p class="text-center text-xs">
                {{ stream.name }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
