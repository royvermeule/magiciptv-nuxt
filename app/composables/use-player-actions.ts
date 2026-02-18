import type { MediaPlayerElement } from "vidstack/elements";

export function usePlayerActions(
  player: Ref<MediaPlayerElement | undefined>,
  container: Ref<HTMLElement | undefined>,
  isFullscreen: Ref<boolean>,
  needsManualPlay: Ref<boolean>,
  resetHideTimer: () => void,
) {
  function manualPlay() {
    needsManualPlay.value = false;
    player.value?.play();
    container.value?.requestFullscreen?.().catch(() => {
      isFullscreen.value = true;
    });
    resetHideTimer();
  }

  function togglePlay() {
    if (!player.value)
      return;
    if (player.value.paused) {
      player.value.play().catch(() => {});
      if (!document.fullscreenElement)
        container.value?.requestFullscreen?.().catch(() => {});
    }
    else {
      player.value.pause();
    }
    resetHideTimer();
  }

  return { manualPlay, togglePlay };
}
