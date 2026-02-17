export function useWatchHistory() {
  let saveTimer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;

  type WatchMeta = {
    streamId: number;
    type: "movie" | "series";
    title: string;
    icon?: string;
    seriesName?: string;
    seriesId?: number;
    seasonNumber?: string;
    episodeNumber?: number;
  };

  const meta = ref<WatchMeta | null>(null);
  const currentTime = ref(0);
  const duration = ref(0);

  async function save() {
    if (!meta.value || !duration.value) {
      return;
    }
    await $fetch("/api/watch-history", {
      method: "POST",
      body: {
        ...meta.value,
        currentTime: Math.floor(currentTime.value),
        duration: Math.floor(duration.value),
      },
    }).catch(() => {});
  }

  function startTracking(data: WatchMeta) {
    meta.value = data;
    stopped = false;
    saveTimer = setInterval(save, 10_000);
  }

  function updateProgress(time: number, dur: number) {
    currentTime.value = time;
    duration.value = dur;
  }

  function stopTracking(skipSave = false) {
    if (stopped) {
      return;
    }
    stopped = true;
    clearInterval(saveTimer);
    if (!skipSave) {
      save();
    }
  }

  async function restoreProgress(streamId: number, type: "movie" | "series"): Promise<number> {
    const progress = await $fetch<{ currentTime?: number }>("/api/watch-history/progress", {
      query: { streamId, type },
    }).catch(() => null);
    return progress?.currentTime && progress.currentTime > 0 ? progress.currentTime : 0;
  }

  return {
    startTracking,
    updateProgress,
    stopTracking,
    restoreProgress,
  };
}
