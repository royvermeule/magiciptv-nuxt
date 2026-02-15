export function useWatchHistory() {
  let saveTimer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;

  type WatchMeta = {
    streamId: number;
    type: "movie" | "series";
    title: string;
    icon?: string;
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

  return {
    startTracking,
    updateProgress,
    stopTracking,
  };
}
