<script setup lang="ts">
definePageMeta({ layout: "hub" });

const { liveStreams: allLiveStreams, movieStreams: allMovies, seriesStreams: allSeries } = useIptvData();

// Fetch continue watching from history
const { data: continueWatching } = useFetch("/api/watch-history/grouped", {
  server: false,
  transform: data => data?.slice(0, 6) ?? [], // Limit to 6 items
});

// Get browse data from global state (limited to 6 items, filtered for valid stream_id)
const liveStreams = computed(() => allLiveStreams.value.filter(s => s.stream_id).slice(0, 6));
const movies = computed(() => allMovies.value.filter(s => s.stream_id).slice(0, 6));
const series = computed(() => allSeries.value.filter(s => s.stream_id).slice(0, 6));

// Delete from history
type PendingDelete
  = | { kind: "series"; seriesId: number }
    | { kind: "movie"; streamId: number };

const deleteModal = ref<any>(null);
const pendingDelete = ref<PendingDelete | null>(null);

function confirmDelete(item: { type: string; seriesId: number | null; streamId: number }) {
  if (item.type === "series" && item.seriesId) {
    pendingDelete.value = { kind: "series", seriesId: item.seriesId };
  }
  else {
    pendingDelete.value = { kind: "movie", streamId: item.streamId };
  }
  deleteModal.value?.open();
}

async function handleDelete() {
  if (!pendingDelete.value) {
    return;
  }

  if (pendingDelete.value.kind === "series") {
    await $fetch("/api/watch-history/by-series", {
      method: "DELETE",
      query: { seriesId: pendingDelete.value.seriesId },
    });
  }
  else {
    await $fetch("/api/watch-history/by-stream", {
      method: "DELETE",
      query: { streamId: pendingDelete.value.streamId, type: "movie" },
    });
  }

  pendingDelete.value = null;
  // Refresh the continue watching section
  await navigateTo("/hub/index", { replace: true });
}
</script>

<template>
  <div>
    <!-- Continue Watching Section -->
    <section v-if="continueWatching?.length" class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">
          Continue Watching
        </h2>
        <NuxtLink to="/hub/history" class="btn btn-ghost btn-sm text-primary hover:text-primary-focus">
          View all
        </NuxtLink>
      </div>
      <div class="grid auto-rows-max grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <HistoryCard
          v-for="item in continueWatching"
          :id="item.streamId"
          :key="item.id"
          :title="item.title"
          :series-name="item.seriesName"
          :series-id="item.seriesId"
          :icon="item.icon"
          :type="item.type"
          :season-number="item.seasonNumber"
          :episode-number="item.episodeNumber"
          :current-time="item.currentTime"
          :duration="item.duration"
          :watched-at="item.watchedAt"
          @delete="confirmDelete(item)"
        />
      </div>
    </section>

    <!-- Live TV Section -->
    <section v-if="liveStreams?.length" class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">
          Live TV
        </h2>
        <NuxtLink to="/hub/live" class="btn btn-ghost btn-sm text-primary hover:text-primary-focus">
          View all
        </NuxtLink>
      </div>
      <div class="grid auto-rows-max grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <StreamCard
          v-for="stream in liveStreams"
          :key="`live-${stream.stream_id}`"
          :stream-id="stream.stream_id"
          :name="stream.name"
          :icon="stream.stream_icon"
          type="live"
        />
      </div>
    </section>

    <!-- Movies Section -->
    <section v-if="movies?.length" class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">
          Movies
        </h2>
        <NuxtLink to="/hub/movies" class="btn btn-ghost btn-sm text-primary hover:text-primary-focus">
          View all
        </NuxtLink>
      </div>
      <div class="grid auto-rows-max grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <StreamCard
          v-for="stream in movies"
          :key="`movie-${stream.stream_id}`"
          :stream-id="stream.stream_id"
          :name="stream.name"
          :icon="stream.stream_icon"
          type="movie"
        />
      </div>
    </section>

    <!-- Series Section -->
    <section v-if="series?.length" class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">
          Series
        </h2>
        <NuxtLink to="/hub/series" class="btn btn-ghost btn-sm text-primary hover:text-primary-focus">
          View all
        </NuxtLink>
      </div>
      <div class="grid auto-rows-max grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <StreamCard
          v-for="stream in series"
          :key="`series-${stream.stream_id}`"
          :stream-id="stream.stream_id"
          :name="stream.name"
          :icon="stream.stream_icon"
          type="series"
        />
      </div>
    </section>

    <!-- Empty state -->
    <div v-if="!continueWatching?.length && !liveStreams?.length && !movies?.length && !series?.length" class="flex flex-col items-center justify-center py-16 opacity-60">
      <Icon name="tabler:inbox" size="48" />
      <p class="mt-4 text-sm">
        No content available
      </p>
    </div>

    <AppConfirmationModel
      ref="deleteModal"
      title="Remove from history"
      :message="pendingDelete?.kind === 'series'
        ? 'Remove all episodes of this series from your watch history?'
        : 'Remove this movie from your watch history?'"
      @confirm="handleDelete"
    />
  </div>
</template>
