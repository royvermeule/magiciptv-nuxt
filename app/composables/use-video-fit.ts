import type { MediaPlayerElement } from "vidstack/elements";

export function useVideoFit(player: Ref<MediaPlayerElement | undefined>) {
  function applyVideoFit() {
    const el = player.value;
    if (!el)
      return;

    const v = el.querySelector("video") as HTMLVideoElement | null;
    if (v) {
      v.style.setProperty("max-width", "100%", "important");
      v.style.setProperty("max-height", "100%", "important");
      v.style.setProperty("width", "100%", "important");
      v.style.setProperty("height", "100%", "important");
      v.style.setProperty("object-fit", "contain", "important");
    }
  }

  let observer: MutationObserver | null = null;

  onMounted(() => {
    applyVideoFit();
    const el = player.value;
    if (!el)
      return;
    observer = new MutationObserver(applyVideoFit);
    observer.observe(el, { childList: true, subtree: true });
  });

  onUnmounted(() => {
    observer?.disconnect();
    observer = null;
  });
}
