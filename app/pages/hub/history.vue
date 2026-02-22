<script setup lang="ts">
import type AppConfirmationModel from "~/components/app-confirmation-model.vue";

definePageMeta({ layout: "hub" });

const { data: history, status, refresh } = useFetch("/api/watch-history/grouped", { server: false });

onMounted(() => {
  refresh();
});

type PendingDelete
  = | { kind: "series"; seriesId: number }
    | { kind: "movie"; streamId: number };

const deleteModal = ref<InstanceType<typeof AppConfirmationModel> | null>(null);
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
  await refresh();
}

function progressPercent(item: { currentTime: number; duration: number }) {
  if (!item.duration) {
    return 0;
  }
  return Math.min(100, Math.round((item.currentTime / item.duration) * 100));
}

// function formatTime(seconds: number) {
//   const h = Math.floor(seconds / 3600);
//   const m = Math.floor((seconds % 3600) / 60);
//   const s = Math.floor(seconds % 60);
//   if (h > 0) {
//     return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
//   }
//   return `${m}:${s.toString().padStart(2, "0")}`;
// }

function watchLink(item: { streamId: number; type: string; title: string; icon: string | null; seriesName: string | null; seriesId: number | null; seasonNumber: string | null; episodeNumber: number | null; containerExtension?: string | null }) {
  if (item.type === "series" && item.seriesId) {
    return {
      path: "/hub/watch",
      query: {
        type: "series",
        id: item.streamId,
        name: item.title,
        icon: item.icon ?? undefined,
        ext: item.containerExtension ?? undefined,
        seriesName: item.seriesName ?? undefined,
        seriesId: item.seriesId,
        season: item.seasonNumber ?? undefined,
        episode: item.episodeNumber ?? undefined,
      },
    };
  }
  return {
    path: "/hub/watch",
    query: {
      type: item.type,
      id: item.streamId,
      name: item.title,
      icon: item.icon ?? undefined,
      ext: item.containerExtension ?? undefined,
    },
  };
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// restore simple navigation for history items (remove prefetch / global player)

// (no local click handler; navigation handled by openStreamFromHistory)

const { requestEnterPlayerFullscreen } = usePlayerIntent();
function navigateToWatchFromHistory(e: MouseEvent, query: Record<string, any>) {
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
    <!-- Loading -->
    <div v-if="status === 'idle' || status === 'pending'" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Empty state -->
    <div v-else-if="status === 'success' && !history?.length" class="flex flex-col items-center justify-center py-16 opacity-60">
      <Icon name="tabler:history" size="48" />
      <p class="mt-4 text-sm">
        No watch history yet
      </p>
    </div>

    <!-- History grid -->
    <div v-else-if="history?.length" class="grid auto-rows-max grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <div
        v-for="item in history"
        :key="item.id"
        class="group relative overflow-hidden rounded-lg bg-base-200"
      >
        <!-- Poster/Thumbnail -->
        <NuxtLink
          :to="watchLink(item)"
          class="block aspect-video w-full overflow-hidden bg-base-300 transition-transform duration-300 group-hover:scale-105"
          @click.prevent="navigateToWatchFromHistory($event, watchLink(item).query)"
        >
          <img
            v-if="item.icon"
            :src="item.icon"
            :alt="item.seriesName ?? item.title"
            class="h-full w-full object-cover"
          >
          <div v-else class="flex h-full w-full items-center justify-center">
            <Icon :name="item.type === 'movie' ? 'tabler:movie' : 'tabler:device-tv'" size="48" class="text-base-content/20" />
          </div>
        </NuxtLink>

        <!-- Info section -->
        <div class="p-2.5">
          <!-- Title -->
          <p class="mb-1 line-clamp-2 text-xs font-semibold leading-tight">
            {{ item.seriesName ?? item.title }}
          </p>

          <!-- Episode info for series -->
          <div v-if="item.type === 'series'" class="mb-1.5 text-[11px] text-base-content/60">
            S{{ item.seasonNumber }}E{{ item.episodeNumber }}
          </div>

          <!-- Time ago -->
          <div class="mb-2 text-[11px] text-base-content/50">
            {{ timeAgo(item.watchedAt) }}
          </div>

          <!-- Progress bar -->
          <div v-if="item.duration" class="mb-2 flex items-center gap-1.5">
            <div class="h-0.5 flex-1 overflow-hidden rounded-full bg-base-300">
              <div
                class="h-full rounded-full bg-primary"
                :style="{ width: `${progressPercent(item)}%` }"
              />
            </div>
            <span class="shrink-0 text-[10px] text-base-content/40">
              {{ Math.round(progressPercent(item)) }}%
            </span>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-1.5">
            <NuxtLink
              v-if="item.type === 'series' && item.seriesId"
              :to="`/hub/series/${item.seriesId}`"
              class="btn btn-circle btn-ghost h-10 w-10 text-base-content/50 hover:text-info"
              title="All episodes"
              @click.stop
            >
              <Icon name="tabler:list" size="30" />
            </NuxtLink>
            <button
              class="btn btn-circle btn-ghost h-10 w-10 text-base-content/50 hover:text-error"
              title="Remove from history"
              @click.stop.prevent="confirmDelete(item)"
            >
              <Icon name="tabler:trash" size="25" />
            </button>
          </div>
        </div>
      </div>
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
