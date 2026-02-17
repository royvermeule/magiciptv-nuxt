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

const { data: lastWatched, refresh: refreshLastWatched } = useFetch(`/api/watch-history/series/${seriesId}`, { lazy: true });

onMounted(() => {
  refreshLastWatched();
});

const seasons = computed(() => Object.keys(seriesInfo.value?.episodes ?? {}).sort((a, b) => Number(a) - Number(b)));
const selectedSeason = ref<string>("");

watch(seasons, (s) => {
  if (s.length && !selectedSeason.value) {
    selectedSeason.value = s[0] ?? "";
  }
});

const episodes = computed(() => seriesInfo.value?.episodes[selectedSeason.value] ?? []);

// restore default navigation behavior for episodes (remove prefetch/play-intent)

// Navigate to the watch page while registering a transient intent for
// the player to enter fullscreen. We perform the navigation ourselves
// (instead of relying on NuxtLink's default) so we can call
// requestFullscreen in the same user gesture without race conditions.
const { requestEnterPlayerFullscreen } = usePlayerIntent();
function navigateToWatch(e: MouseEvent, query: Record<string, any>) {
  if (e.button !== 0)
    return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    const url = `/hub/watch?${new URLSearchParams(query).toString()}`;
    window.open(url, "_blank");
    return;
  }

  requestEnterPlayerFullscreen();
  try {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  catch {
    /* ignore */
  }
  navigateTo({ path: "/hub/watch", query });
}
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
      <!-- Continue watching -->
      <div v-if="lastWatched" class="mb-4">
        <h3 class="mb-2 text-sm font-semibold text-base-content/70">
          Continue watching
        </h3>
        <NuxtLink
          :to="{ path: '/hub/watch', query: { type: 'series', id: lastWatched.streamId, name: lastWatched.title, icon: seriesIcon, seriesId, seriesName, season: lastWatched.seasonNumber, episode: lastWatched.episodeNumber } }"
          class="flex items-center gap-3 rounded-lg bg-base-200 p-3 transition-colors hover:bg-base-300"
          @click.prevent="navigateToWatch($event, { type: 'series', id: lastWatched.streamId, name: lastWatched.title, icon: seriesIcon, seriesId, seriesName, season: lastWatched.seasonNumber, episode: lastWatched.episodeNumber })"
        >
          <Icon name="tabler:player-play-filled" size="24" class="shrink-0 text-primary" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">
              S{{ lastWatched.seasonNumber }}E{{ lastWatched.episodeNumber }} - {{ lastWatched.title }}
            </p>
            <div v-if="lastWatched.duration" class="mt-1 flex items-center gap-2">
              <div class="h-1 flex-1 overflow-hidden rounded-full bg-base-300">
                <div
                  class="h-full rounded-full bg-primary"
                  :style="{ width: `${Math.min(100, Math.round((lastWatched.currentTime / lastWatched.duration) * 100))}%` }"
                />
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>

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
          :to="{ path: '/hub/watch', query: { type: 'series', id: ep.id, name: ep.title, icon: seriesIcon, ext: ep.container_extension, seriesId, seriesName, season: selectedSeason, episode: ep.episode_num } }"
          class="btn btn-ghost justify-start gap-3"
          @click.prevent="navigateToWatch($event, { type: 'series', id: ep.id, name: ep.title, icon: seriesIcon, ext: ep.container_extension, seriesId, seriesName, season: selectedSeason, episode: ep.episode_num })"
        >
          <Icon name="tabler:player-play" size="18" />
          <span class="text-sm">E{{ ep.episode_num }} - {{ ep.title }}</span>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
