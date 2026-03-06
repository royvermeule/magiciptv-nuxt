export function usePlayerControls(isPlaying: Ref<boolean>, onHide?: () => void) {
  const controlsVisible = ref(true);

  let hideTimer: ReturnType<typeof setTimeout>;
  let lastShownAt = 0;

  function resetHideTimer() {
    clearTimeout(hideTimer);
    if (isPlaying.value) {
      hideTimer = setTimeout(() => {
        controlsVisible.value = false;
      }, 3000);
    }
  }

  function showControlsTemporarily() {
    controlsVisible.value = true;
    lastShownAt = Date.now();
    resetHideTimer();
  }

  function hideControls() {
    if (Date.now() - lastShownAt < 400)
      return;
    controlsVisible.value = false;
    onHide?.();
    clearTimeout(hideTimer);
  }

  watch(isPlaying, (playing) => {
    if (!playing) {
      controlsVisible.value = true;
      clearTimeout(hideTimer);
    }
    else {
      resetHideTimer();
    }
  });

  function dispose() {
    clearTimeout(hideTimer);
  }

  return {
    controlsVisible,
    showControlsTemporarily,
    hideControls,
    resetHideTimer,
    dispose,
  };
}
