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
      <HistoryCard
        v-for="item in history"
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
