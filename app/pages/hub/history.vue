<script setup lang="ts">
import type AppConfirmationModel from "~/components/app-confirmation-model.vue";

definePageMeta({ layout: "hub" });

const { data: history, status, refresh } = useFetch("/api/watch-history", { lazy: true });

onMounted(() => {
  refresh();
});

const deleteModal = ref<InstanceType<typeof AppConfirmationModel> | null>(null);
const pendingDeleteId = ref<number | null>(null);

function confirmDelete(id: number) {
  pendingDeleteId.value = id;
  deleteModal.value?.open();
}

async function handleDelete() {
  if (!pendingDeleteId.value) {
    return;
  }
  await $fetch(`/api/watch-history/${pendingDeleteId.value}`, { method: "DELETE" });
  pendingDeleteId.value = null;
  await refresh();
}

function progressPercent(item: { currentTime: number; duration: number }) {
  if (!item.duration) {
    return 0;
  }
  return Math.min(100, Math.round((item.currentTime / item.duration) * 100));
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function watchLink(item: { streamId: number; type: string; title: string; icon: string | null; seriesId: number | null; seasonNumber: string | null; episodeNumber: number | null }) {
  if (item.type === "series" && item.seriesId) {
    return {
      path: "/hub/watch",
      query: {
        type: "series",
        id: item.streamId,
        name: item.title,
        icon: item.icon ?? undefined,
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
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex justify-center py-16">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!history?.length" class="flex flex-col items-center justify-center py-16 opacity-60">
      <Icon name="tabler:history" size="48" />
      <p class="mt-4 text-sm">
        No watch history yet. Start watching something!
      </p>
    </div>

    <!-- History list -->
    <div v-else class="flex flex-col gap-2">
      <NuxtLink
        v-for="item in history"
        :key="item.id"
        :to="watchLink(item)"
        class="flex items-center gap-3 rounded-lg bg-base-100 p-3 transition-colors hover:bg-base-200"
      >
        <!-- Thumbnail -->
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-base-200">
          <img
            v-if="item.icon"
            :src="item.icon"
            :alt="item.title"
            class="h-14 w-14 rounded object-contain"
          >
          <Icon v-else :name="item.type === 'movie' ? 'tabler:movie' : 'tabler:device-tv'" size="28" class="text-base-content/30" />
        </div>

        <!-- Info -->
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">
            {{ item.title }}
          </p>
          <div class="mt-0.5 flex items-center gap-2 text-xs text-base-content/50">
            <span class="badge badge-xs" :class="item.type === 'movie' ? 'badge-secondary' : 'badge-accent'">
              {{ item.type }}
            </span>
            <span v-if="item.seasonNumber">S{{ item.seasonNumber }}E{{ item.episodeNumber }}</span>
            <span>{{ timeAgo(item.watchedAt) }}</span>
          </div>

          <!-- Progress bar -->
          <div v-if="item.duration" class="mt-1.5 flex items-center gap-2">
            <div class="h-1 flex-1 overflow-hidden rounded-full bg-base-300">
              <div
                class="h-full rounded-full bg-primary"
                :style="{ width: `${progressPercent(item)}%` }"
              />
            </div>
            <span class="shrink-0 text-[10px] text-base-content/40">
              {{ formatTime(item.currentTime) }} / {{ formatTime(item.duration) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex shrink-0 items-center gap-1">
          <button
            class="btn btn-circle btn-ghost btn-xs text-base-content/30 hover:text-error"
            @click.prevent="confirmDelete(item.id)"
          >
            <Icon name="tabler:trash" size="16" />
          </button>
          <Icon name="tabler:player-play" size="20" class="text-base-content/30" />
        </div>
      </NuxtLink>
    </div>

    <AppConfirmationModel
      ref="deleteModal"
      title="Remove from history"
      message="Are you sure you want to remove this from your watch history?"
      @confirm="handleDelete"
    />
  </div>
</template>
