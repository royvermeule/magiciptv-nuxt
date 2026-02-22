<script setup lang="ts">
// Ensure we exit fullscreen if the user navigates away from this page
// (covers hardware/back-button and other navigation paths).
import { useFullscreen } from "~/composables/use-fullscreen";

definePageMeta({ layout: "hub" });

const route = useRoute();

const type = computed(() => (route.query.type as string) as "live" | "movie" | "series");
const streamId = computed(() => route.query.id as string);
const streamName = computed(() => route.query.name as string ?? "");
const streamIcon = computed(() => route.query.icon as string | undefined);
const seriesId = computed(() => route.query.seriesId ? Number(route.query.seriesId) : undefined);
const seriesNameQuery = computed(() => route.query.seriesName as string | undefined);
const seasonNumber = computed(() => route.query.season as string | undefined);
const episodeNumber = computed(() => route.query.episode ? Number(route.query.episode) : undefined);
const streamExt = computed(() => route.query.ext as string | undefined);

const { data: stream } = await useFetch("/api/xtream/stream-url", {
  query: { type, id: streamId, ext: streamExt },
});
const { ensureExitOnRouteLeave } = useFullscreen();
ensureExitOnRouteLeave();

// player is local to this page (AppPlayer is rendered below)

// Fetch series episode list for prev/next navigation
type SeriesInfoResponse = {
  episodes: Record<string, { id: string; title: string; episode_num: number; container_extension: string }[]>;
};

const isSeries = type.value === "series" && !!seriesId.value;
const { getSeriesInfo, setSeriesInfo } = useIptvData();
const cache = useIptvCache();
const seriesInfo = computed(() => (isSeries && seriesId.value ? getSeriesInfo(String(seriesId.value)) : null) ?? null);

onMounted(async () => {
  if (!isSeries || !seriesId.value)
    return;
  const sid = String(seriesId.value);
  if (getSeriesInfo(sid))
    return;

  const cached = await cache.get<NonNullable<ReturnType<typeof getSeriesInfo>>>(`series-info-${sid}`);
  if (cached) {
    setSeriesInfo(sid, cached);
    return;
  }

  const info = await $fetch<NonNullable<ReturnType<typeof getSeriesInfo>>>("/api/xtream/series/info", {
    query: { seriesId: sid },
  }).catch(() => null);
  if (info) {
    setSeriesInfo(sid, info);
    await cache.set(`series-info-${sid}`, info);
  }
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

const nextStreamUrl = ref<string | null>(null);
const prevStreamUrl = ref<string | null>(null);

watch(currentEpisodeIndex, async (idx) => {
  if (!isSeries) {
    nextStreamUrl.value = null;
    prevStreamUrl.value = null;
    return;
  }

  const next = allEpisodes.value[idx + 1];
  const prev = allEpisodes.value[idx - 1];

  if (next) {
    const res = await $fetch("/api/xtream/stream-url", { query: { type: type.value, id: next.id, ext: next.ext } }).catch(() => null);
    nextStreamUrl.value = res?.url ?? null;
  }
  else {
    nextStreamUrl.value = null;
  }

  if (prev) {
    const res = await $fetch("/api/xtream/stream-url", { query: { type: type.value, id: prev.id, ext: prev.ext } }).catch(() => null);
    prevStreamUrl.value = res?.url ?? null;
  }
  else {
    prevStreamUrl.value = null;
  }
}, { immediate: true });

// (no global player wiring here)

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
      seriesName: seriesNameQuery.value,
      season: ep.season,
      episode: allEpisodes.value.find(e => e.id === ep.id)?.episodeNum,
    },
  }, { replace: true });
}

function onNextEpisode() {
  const idx = currentEpisodeIndex.value;
  if (idx < 0 || idx >= allEpisodes.value.length - 1) {
    return;
  }
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
    <!-- All Episodes link for series -->
    <div v-if="isSeries && seriesId" class="mb-3">
      <NuxtLink
        :to="`/hub/series/${seriesId}`"
        class="btn btn-ghost btn-sm gap-1 text-base-content/60"
      >
        <Icon name="tabler:list" size="18" />
        All episodes
      </NuxtLink>
    </div>

    <ClientOnly>
      <!-- keep the same AppPlayer instance across episode navigation so
     fullscreen mode is preserved (removing the :key prevents a
     full component remount when the query/streamId changes) -->
      <AppPlayer
        v-if="stream?.url"
        :src="stream.url"
        :next-src="nextStreamUrl"
        :prev-src="prevStreamUrl"
        :title="streamName"
        :poster="streamIcon"
        :type="type"
        :stream-id="Number(streamId)"
        :series-name="seriesNameQuery"
        :series-id="seriesId"
        :season-number="seasonNumber"
        :episode-number="episodeNumber"
        :container-extension="streamExt"
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
