import type { MediaPlayerElement } from "vidstack/elements";

export function useVolume(player: Ref<MediaPlayerElement | undefined>, onInteract?: () => void) {
  const volume = ref(1);
  const isMuted = ref(false);

  const volumeIcon = computed(() => {
    if (isMuted.value || volume.value === 0)
      return "tabler:volume-off";
    if (volume.value < 0.5)
      return "tabler:volume-2";
    return "tabler:volume";
  });

  const volumeProgress = computed(() => `${(isMuted.value ? 0 : volume.value) * 100}%`);

  function toggleMute() {
    if (!player.value)
      return;
    player.value.muted = !player.value.muted;
    onInteract?.();
  }

  function onVolumeInput(e: Event) {
    const val = (e.target as HTMLInputElement).valueAsNumber;
    if (!player.value)
      return;
    player.value.volume = val;
    if (val > 0 && player.value.muted)
      player.value.muted = false;
    onInteract?.();
  }

  // Called from player subscription to keep state in sync
  function setVolumeState(vol: number, muted: boolean) {
    volume.value = vol;
    isMuted.value = muted;
  }

  return {
    volume,
    isMuted,
    volumeIcon,
    volumeProgress,
    toggleMute,
    onVolumeInput,
    setVolumeState,
  };
}
