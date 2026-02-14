<script setup lang="ts">
definePageMeta({ layout: "hub" });

const route = useRoute();

const seriesId = route.params.id as string;
const seriesName = route.query.name as string ?? "";
const seriesIcon = route.query.icon as string | undefined;

const { data: seriesInfo, status } = useFetch<{
  episodes: Record<string, { id: string; title: string; episode_num: number; container_extension: string }[]>;
}>("/api/xtream/series/info", {
  query: { seriesId },
  lazy: true,
});

const seasons = computed(() => Object.keys(seriesInfo.value?.episodes ?? {}).sort((a, b) => Number(a) - Number(b)));
const selectedSeason = ref<string>("");

watch(seasons, (s) => {
  if (s.length && !selectedSeason.value) {
    selectedSeason.value = s[0] ?? "";
  }
}, { immediate: true });

const episodes = computed(() => seriesInfo.value?.episodes[selectedSeason.value] ?? []);
</script>

<template>
  <div>
    <!-- Header with back button + series name/icon -->
    <div class="mb-4 flex items-center gap-3">
      <button class="btn btn-circle btn-ghost btn-sm" @click="$router.back()">
        <Icon name="tabler:arrow-left" size="20" />
      </button>
      <img v-if="seriesIcon" :src="seriesIcon" :alt="seriesName" class="h-10 w-10 rounded object-contain">
      <h2 class="text-lg font-bold">
        {{ seriesName }}
      </h2>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <template v-else-if="seriesInfo">
      <!-- Season pills -->
      <div class="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          v-for="season in seasons"
          :key="season"
          class="btn btn-sm whitespace-nowrap"
          :class="selectedSeason === season ? 'btn-primary' : 'btn-ghost'"
          @click="selectedSeason = season"
        >
          Season {{ season }}
        </button>
      </div>

      <!-- Episode list -->
      <div class="flex flex-col gap-2">
        <NuxtLink
          v-for="ep in episodes"
          :key="ep.id"
          :to="{ path: '/hub/watch', query: { type: 'series', id: ep.id, name: ep.title, icon: seriesIcon, ext: ep.container_extension } }"
          class="btn btn-ghost justify-start gap-3"
        >
          <Icon name="tabler:player-play" size="18" />
          <span class="text-sm">E{{ ep.episode_num }} - {{ ep.title }}</span>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
