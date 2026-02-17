import { ref } from "vue";

// Transient, in-memory intent flags used to communicate short-lived
// user gestures (like "open player fullscreen on next navigation")
// between clickable items and the player component without using
// persistent storage (sessionStorage).
const _enterPlayerFullscreen = ref(false);

export function usePlayerIntent() {
  function requestEnterPlayerFullscreen() {
    _enterPlayerFullscreen.value = true;
  }

  function consumeEnterPlayerFullscreen() {
    const v = _enterPlayerFullscreen.value;
    _enterPlayerFullscreen.value = false;
    return v;
  }

  return {
    requestEnterPlayerFullscreen,
    consumeEnterPlayerFullscreen,
  };
}
