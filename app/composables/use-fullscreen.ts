import { onBeforeRouteLeave } from "vue-router";

export function useFullscreen() {
  // Gracefully exit fullscreen and wait for the change event (timeout default: 500ms).
  async function exit(timeout = 500) {
    try {
      const isActive = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isActive)
        return;

      try {
        await (document.exitFullscreen?.() ?? Promise.reject(new Error("no-exitFullscreen")));
      }
      catch {
        // try vendor-prefixed fallback (older Safari)
        try {
          (document as any).webkitExitFullscreen?.();
        }
        catch {
          /* ignore */
        }
      }

      // wait for the fullscreenchange event or timeout
      await new Promise<void>((resolve) => {
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          resolve();
          return;
        }
        const onFs = () => {
          document.removeEventListener("fullscreenchange", onFs);
          resolve();
        };
        document.addEventListener("fullscreenchange", onFs);
        setTimeout(() => {
          document.removeEventListener("fullscreenchange", onFs);
          resolve();
        }, timeout);
      });
    }
    catch {
      /* swallow - callers shouldn't fail because fullscreen couldn't be exited */
    }
  }

  // Helper to register a route-leave hook that ensures fullscreen is exited.
  function ensureExitOnRouteLeave() {
    onBeforeRouteLeave(() => {
      // fire-and-forget; keep navigation smooth
      exit().catch(() => {});
    });
  }

  return { exit, ensureExitOnRouteLeave };
}
