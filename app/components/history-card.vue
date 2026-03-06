<script setup lang="ts">
const props = defineProps<{
  id: number;
  title: string;
  seriesName: string | null;
  seriesId?: number | null;
  icon: string | null;
  type: string;
  seasonNumber?: string | null;
  episodeNumber?: number | null;
  currentTime: number;
  duration: number;
  watchedAt: string;
}>();

defineEmits<{
  delete: [];
}>();

function progressPercent() {
  if (!props.duration) {
    return 0;
  }
  return Math.min(100, Math.round((props.currentTime / props.duration) * 100));
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

function watchLink() {
  if (props.type === "series" && props.seriesName) {
    return {
      path: "/hub/watch",
      query: {
        type: "series",
        id: props.id,
        name: props.title,
        seriesName: props.seriesName,
        seasonNumber: props.seasonNumber ?? undefined,
        episodeNumber: props.episodeNumber ?? undefined,
      },
    };
  }
  return {
    path: "/hub/watch",
    query: {
      type: props.type,
      id: props.id,
      name: props.title,
    },
  };
}

const { requestEnterPlayerFullscreen } = usePlayerIntent();
function handleClick(e: MouseEvent) {
  if (e.button !== 0)
    return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    const url = `/hub/watch?${new URLSearchParams(watchLink().query as any).toString()}`;
    window.open(url, "_blank");
    return;
  }

  requestEnterPlayerFullscreen();
  navigateTo(watchLink());
}
</script>

<template>
  <div class="group relative overflow-hidden rounded-lg bg-base-200">
    <!-- Poster/Thumbnail -->
    <div
      class="block aspect-video w-full overflow-hidden bg-base-300 transition-transform duration-300 group-hover:scale-105 cursor-pointer"
      @click="handleClick"
    >
      <img
        v-if="icon"
        :src="icon"
        :alt="seriesName ?? title"
        class="h-full w-full object-cover"
      >
      <div v-else class="flex h-full w-full items-center justify-center">
        <Icon :name="type === 'movie' ? 'tabler:movie' : 'tabler:device-tv'" size="48" class="text-base-content/20" />
      </div>
    </div>

    <!-- Info section -->
    <div class="p-2.5">
      <!-- Title -->
      <p class="mb-1 line-clamp-2 text-xs font-semibold leading-tight">
        {{ seriesName ?? title }}
      </p>

      <!-- Episode info for series -->
      <div v-if="type === 'series'" class="mb-1.5 text-[11px] text-base-content/60">
        S{{ seasonNumber }}E{{ episodeNumber }}
      </div>

      <!-- Time ago -->
      <div class="mb-2 text-[11px] text-base-content/50">
        {{ timeAgo(watchedAt) }}
      </div>

      <!-- Progress bar -->
      <div v-if="duration" class="mb-2 flex items-center gap-1.5">
        <div class="h-0.5 flex-1 overflow-hidden rounded-full bg-base-300">
          <div
            class="h-full rounded-full bg-primary"
            :style="{ width: `${progressPercent()}%` }"
          />
        </div>
        <span class="shrink-0 text-[10px] text-base-content/40">
          {{ Math.round(progressPercent()) }}%
        </span>
      </div>

      <!-- Action buttons -->
      <div class="flex gap-1.5">
        <NuxtLink
          v-if="type === 'series' && seriesId"
          :to="`/hub/series/${seriesId}`"
          class="btn btn-circle btn-ghost h-10 w-10 text-base-content/50 hover:text-info"
          title="All episodes"
          @click.stop
        >
          <Icon name="tabler:list" size="30" />
        </NuxtLink>
        <button
          class="btn btn-circle btn-ghost h-10 w-10 text-base-content/50 hover:text-error"
          title="Remove from history"
          @click.stop.prevent="$emit('delete')"
        >
          <Icon name="tabler:trash" size="25" />
        </button>
      </div>
    </div>
  </div>
</template>
