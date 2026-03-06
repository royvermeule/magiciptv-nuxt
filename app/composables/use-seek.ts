import type { MediaPlayerElement } from "vidstack/elements";

export function useSeek(player: Ref<MediaPlayerElement | undefined>, onSeekEnd?: () => void) {
  const currentTime = ref(0);
  const duration = ref(0);
  const isSeeking = ref(false);
  const seekValue = ref(0);

  const displayTime = computed(() => isSeeking.value ? seekValue.value : currentTime.value);
  const progress = computed(() => {
    if (!duration.value)
      return "0%";
    return `${(displayTime.value / duration.value) * 100}%`;
  });

  function onSeekStart(e: Event) {
    isSeeking.value = true;
    seekValue.value = (e.target as HTMLInputElement).valueAsNumber;
  }

  function onSeekInput(e: Event) {
    seekValue.value = (e.target as HTMLInputElement).valueAsNumber;
  }

  function commitSeek() {
    if (player.value)
      player.value.currentTime = seekValue.value;
    isSeeking.value = false;
    onSeekEnd?.();
  }

  function seekBackward() {
    if (player.value)
      player.value.currentTime = Math.max(0, player.value.currentTime - 10);
    onSeekEnd?.();
  }

  function seekForward() {
    if (player.value)
      player.value.currentTime += 10;
    onSeekEnd?.();
  }

  function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Called from player subscription to keep time in sync
  function setTime(ct: number, dur: number) {
    currentTime.value = ct;
    duration.value = dur;
  }

  return {
    currentTime,
    duration,
    isSeeking,
    seekValue,
    displayTime,
    progress,
    onSeekStart,
    onSeekInput,
    onSeekEnd: commitSeek,
    seekBackward,
    seekForward,
    formatTime,
    setTime,
  };
}
