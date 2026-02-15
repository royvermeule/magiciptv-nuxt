<script setup lang="ts">
definePageMeta({ layout: "hub" });

const route = useRoute();

const type = computed(() => (route.query.type as string) as "live" | "movie" | "series");
const streamId = computed(() => route.query.id as string);
const streamName = computed(() => route.query.name as string ?? "");
const streamIcon = computed(() => route.query.icon as string | undefined);
const seriesId = computed(() => route.query.seriesId ? Number(route.query.seriesId) : undefined);
const seasonNumber = computed(() => route.query.season as string | undefined);
const episodeNumber = computed(() => route.query.episode ? Number(route.query.episode) : undefined);

const { data: stream } = await useFetch("/api/xtream/stream-url", {
  query: { type, id: streamId },
});

// Fetch series episode list for prev/next navigation
type SeriesInfoResponse = {
  episodes: Record<string, { id: string; title: string; episode_num: number; container_extension: string }[]>;
};

const isSeries = type.value === "series" && !!seriesId.value;
const { data: seriesInfo } = useFetch<SeriesInfoResponse>("/api/xtream/series/info", {
  query: { seriesId },
  lazy: true,
  immediate: isSeries,
});

// Build a flat sorted list of all episodes across seasons
const allEpisodes = computed(() => {
  const info = seriesInfo.value as SeriesInfoResponse | null;
  if (!info?.episodes) {
    return [];
  }
  const eps: { season: string; id: string; title: string; episodeNum: number; ext: string }[] = [];
  const seasons = Object.keys(info.episodes).sort((a, b) => Number(a) - Number(b));
  for (const season of seasons) {
    for (const ep of info.episodes[season] ?? []) {
      eps.push({ season, id: ep.id, title: ep.title, episodeNum: ep.episode_num, ext: ep.container_extension });
    }
  }
  return eps;
});

const currentEpisodeIndex = computed(() => {
  return allEpisodes.value.findIndex(ep => ep.id === streamId.value);
});

const hasPrevEpisode = computed(() => currentEpisodeIndex.value > 0);
const hasNextEpisode = computed(() => currentEpisodeIndex.value >= 0 && currentEpisodeIndex.value < allEpisodes.value.length - 1);

function navigateToEpisode(ep: { season: string; id: string; title: string; ext: string }) {
  navigateTo({
    path: "/hub/watch",
    query: {
      type: "series",
      id: ep.id,
      name: ep.title,
      icon: streamIcon.value,
      ext: ep.ext,
      seriesId: seriesId.value,
      season: ep.season,
      episode: allEpisodes.value.find(e => e.id === ep.id)?.episodeNum,
    },
  }, { replace: true });
}

async function onNextEpisode() {
  const idx = currentEpisodeIndex.value;
  if (idx < 0 || idx >= allEpisodes.value.length - 1) {
    return;
  }
  // Delete current episode from watch history
  await $fetch("/api/watch-history/by-stream", {
    method: "DELETE",
    query: { streamId: streamId.value, type: "series" },
  }).catch(() => {});
  const next = allEpisodes.value[idx + 1];
  if (next) {
    navigateToEpisode(next);
  }
}

function onPrevEpisode() {
  const idx = currentEpisodeIndex.value;
  if (idx <= 0) {
    return;
  }
  const prev = allEpisodes.value[idx - 1];
  if (prev) {
    navigateToEpisode(prev);
  }
}
</script>

<template>
  <div>
    <ClientOnly>
      <AppPlayer
        v-if="stream?.url"
        :key="streamId"
        :src="stream.url"
        :title="streamName"
        :poster="streamIcon"
        :type="type"
        :stream-id="Number(streamId)"
        :series-id="seriesId"
        :season-number="seasonNumber"
        :episode-number="episodeNumber"
        :has-prev-episode="hasPrevEpisode"
        :has-next-episode="hasNextEpisode"
        @prev-episode="onPrevEpisode"
        @next-episode="onNextEpisode"
      />
      <template #fallback>
        <div class="flex aspect-video items-center justify-center rounded-lg bg-base-200">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
