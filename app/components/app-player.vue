<script setup lang="ts">
import type { MediaProviderChangeEvent, TextTrack } from "vidstack";
import type { MediaPlayerElement } from "vidstack/elements";

import { isHLSProvider } from "vidstack";
import "vidstack/player";
import "vidstack/player/styles/default/theme.css";

const props = defineProps<{
  src: string;
  title?: string;
  poster?: string;
  type?: "live" | "movie" | "series";
}>();

const router = useRouter();
const player = ref<MediaPlayerElement>();
const container = ref<HTMLElement>();
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const controlsVisible = ref(true);
const isFullscreen = ref(false);
const volume = ref(1);
const isMuted = ref(false);

let hideTimer: ReturnType<typeof setTimeout>;
let unsubscribe: (() => void) | undefined;

const showSeek = computed(() => props.type === "movie" || props.type === "series");
const isLive = computed(() => props.type === "live");

function onProviderChange(event: MediaProviderChangeEvent) {
  const provider = event.detail;
  if (isHLSProvider(provider)) {
    provider.config = {};
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

function goBack() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {
      isFullscreen.value = false;
    });
  }
  router.back();
}

onMounted(() => {
  const el = player.value;
  if (!el)
    return;

  unsubscribe = el.subscribe(({ paused, currentTime: ct, duration: dur, volume: vol, muted }) => {
    isPlaying.value = !paused;
    currentTime.value = ct;
    duration.value = dur;
    volume.value = vol;
    isMuted.value = muted;
  });

  document.addEventListener("fullscreenchange", onFullscreenChange);

  // Listen for subtitle track changes
  el.textTracks.addEventListener("add", () => refreshSubtitleTracks());
  el.textTracks.addEventListener("remove", () => refreshSubtitleTracks());

  // Auto-play and auto-fullscreen
  el.addEventListener("can-play", () => {
    el.play();
    container.value?.requestFullscreen().catch(() => {
      isFullscreen.value = true;
    });
  }, { once: true });
});

onUnmounted(() => {
  unsubscribe?.();
  clearTimeout(hideTimer);
  document.removeEventListener("fullscreenchange", onFullscreenChange);
});

function seekBackward() {
  if (player.value)
    player.value.currentTime = Math.max(0, player.value.currentTime - 10);
  resetHideTimer();
}

function seekForward() {
  if (player.value)
    player.value.currentTime += 10;
  resetHideTimer();
}

function togglePlay() {
  if (!player.value)
    return;
  if (player.value.paused)
    player.value.play();
  else player.value.pause();
  resetHideTimer();
}

async function toggleFullscreen() {
  const el = container.value;
  if (!el)
    return;

  if (!document.fullscreenElement) {
    await el.requestFullscreen().catch(() => {
      // Fallback to CSS fullscreen if API not supported
      isFullscreen.value = true;
    });
  }
  else {
    await document.exitFullscreen().catch(() => {
      isFullscreen.value = false;
    });
  }
  resetHideTimer();
}

// Volume controls
const volumeIcon = computed(() => {
  if (isMuted.value || volume.value === 0) {
    return "tabler:volume-off";
  }
  if (volume.value < 0.5) {
    return "tabler:volume-2";
  }
  return "tabler:volume";
});

const volumeProgress = computed(() => `${(isMuted.value ? 0 : volume.value) * 100}%`);

function toggleMute() {
  if (!player.value) {
    return;
  }
  player.value.muted = !player.value.muted;
  resetHideTimer();
}

function onVolumeInput(e: Event) {
  if (!player.value) {
    return;
  }
  const val = (e.target as HTMLInputElement).valueAsNumber;
  player.value.volume = val;
  if (val > 0 && player.value.muted) {
    player.value.muted = false;
  }
  resetHideTimer();
}

// Subtitle controls
type SubtitleTrack = {
  id: string;
  label: string;
  language: string;
  track: TextTrack;
};

const subtitleTracks = ref<SubtitleTrack[]>([]);
const activeSubtitleId = ref<string | null>(null);
const subtitleMenuOpen = ref(false);
const showSubtitles = computed(() => !isLive.value);

function refreshSubtitleTracks() {
  const el = player.value;
  if (!el) {
    return;
  }

  const tracks: SubtitleTrack[] = [];
  for (const track of el.textTracks) {
    if (track.kind === "subtitles" || track.kind === "captions") {
      tracks.push({
        id: track.id || `${track.language}-${track.label}`,
        label: track.label || track.language || "Unknown",
        language: track.language || "",
        track,
      });
    }
  }
  subtitleTracks.value = tracks;

  const active = tracks.find(t => t.track.mode === "showing");
  activeSubtitleId.value = active?.id ?? null;
}

function selectSubtitle(id: string | null) {
  const el = player.value;
  if (!el) {
    return;
  }

  for (const track of el.textTracks) {
    if (track.kind === "subtitles" || track.kind === "captions") {
      track.mode = "disabled";
    }
  }

  if (id) {
    const selected = subtitleTracks.value.find(t => t.id === id);
    if (selected) {
      selected.track.mode = "showing";
    }
  }

  activeSubtitleId.value = id;
  subtitleMenuOpen.value = false;
  resetHideTimer();
}

function toggleSubtitleMenu() {
  subtitleMenuOpen.value = !subtitleMenuOpen.value;
  if (subtitleMenuOpen.value) {
    refreshSubtitleTracks();
  }
  resetHideTimer();
}

// Seek slider logic
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

function onSeekEnd() {
  if (player.value)
    player.value.currentTime = seekValue.value;
  isSeeking.value = false;
  resetHideTimer();
}

// Controls visibility
let lastShownAt = 0;

function showControlsTemporarily() {
  controlsVisible.value = true;
  lastShownAt = Date.now();
  resetHideTimer();
}

function hideControls() {
  // Ignore if controls were just shown (prevents the same touch from show+hide)
  if (Date.now() - lastShownAt < 400)
    return;
  controlsVisible.value = false;
  subtitleMenuOpen.value = false;
  clearTimeout(hideTimer);
}

function resetHideTimer() {
  clearTimeout(hideTimer);
  if (isPlaying.value) {
    hideTimer = setTimeout(() => {
      controlsVisible.value = false;
    }, 3000);
  }
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

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>

<template>
  <div
    ref="container"
    class="player-container relative select-none overflow-hidden bg-black"
    :class="[isFullscreen ? 'player-fullscreen' : 'aspect-video w-full rounded-lg', !controlsVisible && 'cursor-none']"
  >
    <!-- Video layer -->
    <media-player
      ref="player"
      class="player"
      :src="src"
      :title="title"
      crossorigin
      playsinline
      @provider-change="onProviderChange"
    >
      <media-provider />
    </media-player>

    <!--
        Touch capture layer: ALWAYS interactive, promoted to its own
        compositor layer so mobile browsers can't route touches to the
        video hardware layer underneath.
      -->
    <div
      class="touch-capture"
      @pointerdown="showControlsTemporarily"
      @pointermove="showControlsTemporarily"
    />

    <!-- Controls overlay (above touch capture) -->
    <div
      class="controls-layer"
      :class="controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'"
      @pointermove="showControlsTemporarily"
    >
      <!-- Top bar — back button + title -->
      <div class="flex h-8 shrink-0 items-center gap-2 bg-linear-to-b from-black/50 to-transparent px-3 sm:h-16 sm:px-4" @click="hideControls">
        <button
          class="flex shrink-0 cursor-pointer items-center justify-center rounded-full p-1 text-white transition-colors hover:bg-white/20"
          @click.stop="goBack"
        >
          <Icon name="tabler:arrow-left" size="28" />
        </button>
        <span v-if="title" class="truncate text-sm text-white sm:text-base" @click.stop>{{ title }}</span>
      </div>

      <!-- Center — background click hides, buttons stop propagation -->
      <div class="flex flex-1 items-center justify-center gap-4 sm:gap-8" @click="hideControls">
        <button
          v-if="showSeek"
          class="flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 sm:p-3"
          @click.stop="seekBackward"
        >
          <Icon name="tabler:rewind-backward-10" class="size-6 sm:size-8" />
        </button>

        <button
          class="flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/40 p-3 text-white transition-colors hover:bg-black/60 sm:p-4"
          @click.stop="togglePlay"
        >
          <Icon :name="isPlaying ? 'tabler:player-pause-filled' : 'tabler:player-play-filled'" size="20" />
        </button>

        <button
          v-if="showSeek"
          class="flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 sm:p-3"
          @click.stop="seekForward"
        >
          <Icon name="tabler:rewind-forward-10" class="size-6 sm:size-8" />
        </button>
      </div>

      <!-- Bottom controls -->
      <div class="shrink-0 bg-linear-to-t from-black/60 to-transparent px-3 pb-1 pt-4 sm:px-4 sm:pb-3 sm:pt-8" @click.stop>
        <input
          v-if="!isLive"
          type="range"
          class="seek-slider"
          min="0"
          :max="duration || 0"
          :value="displayTime"
          :style="{ '--progress': progress }"
          step="0.1"
          @mousedown="onSeekStart"
          @touchstart.passive="onSeekStart"
          @input="onSeekInput"
          @mouseup="onSeekEnd"
          @touchend="onSeekEnd"
        >

        <div class="mt-0.5 flex items-center justify-between text-xs text-white/80 sm:mt-1">
          <div class="flex items-center gap-1">
            <span v-if="isLive" class="badge badge-error badge-sm gap-1">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-white" />
              LIVE
            </span>
            <span v-else>{{ formatTime(displayTime) }} / {{ formatTime(duration) }}</span>

            <button
              class="rounded p-1 text-white transition-colors hover:bg-white/20"
              @click="toggleMute"
            >
              <Icon :name="volumeIcon" size="20" />
            </button>
            <input
              type="range"
              class="volume-slider hidden sm:block"
              min="0"
              max="1"
              step="0.01"
              :value="isMuted ? 0 : volume"
              :style="{ '--volume-progress': volumeProgress }"
              @input="onVolumeInput"
            >
          </div>

          <div class="flex items-center gap-1">
            <!-- Subtitle button -->
            <div v-if="showSubtitles" class="relative">
              <button
                class="rounded p-1 text-white transition-colors hover:bg-white/20"
                :class="activeSubtitleId ? 'text-primary' : ''"
                @click="toggleSubtitleMenu"
              >
                <Icon name="tabler:message-language" size="20" />
              </button>

              <!-- Subtitle menu -->
              <div
                v-if="subtitleMenuOpen"
                class="absolute bottom-full right-0 mb-2 min-w-40 rounded-lg bg-base-300/95 py-1 shadow-lg backdrop-blur-sm"
              >
                <template v-if="subtitleTracks.length > 0">
                  <button
                    class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-white hover:bg-white/10"
                    :class="!activeSubtitleId ? 'font-bold text-primary' : ''"
                    @click="selectSubtitle(null)"
                  >
                    <Icon name="tabler:x" size="14" />
                    Off
                  </button>
                  <button
                    v-for="track in subtitleTracks"
                    :key="track.id"
                    class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-white hover:bg-white/10"
                    :class="activeSubtitleId === track.id ? 'font-bold text-primary' : ''"
                    @click="selectSubtitle(track.id)"
                  >
                    <Icon name="tabler:check" size="14" :class="activeSubtitleId === track.id ? 'opacity-100' : 'opacity-0'" />
                    {{ track.label }}
                  </button>
                </template>
                <span v-else class="block px-3 py-1.5 text-sm text-white/50">No subtitles available</span>
              </div>
            </div>

            <button
              class="rounded p-1 text-white transition-colors hover:bg-white/20"
              @click="toggleFullscreen"
            >
              <Icon :name="isFullscreen ? 'tabler:minimize' : 'tabler:maximize'" size="24" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-container {
  touch-action: manipulation;
  isolation: isolate;
}

.player-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 999999;
}

.player-container:fullscreen {
  width: 100%;
  height: 100%;
  background: black;
}

.player {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* Always-on touch capture: sits between video (z-0) and controls (z-20).
   transform promotes it to its own compositor layer so the mobile browser
   cannot route touches to the video's hardware-decoded layer underneath. */
.touch-capture {
  position: absolute;
  inset: 0;
  z-index: 10;
  /* Nearly-invisible background + transform: the combination forces the
     browser to allocate a real compositor layer that intercepts touches. */
  background: rgba(0, 0, 0, 0.001);
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.controls-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  transition: opacity 0.2s ease;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.seek-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(to right, white var(--progress, 0%), rgba(255, 255, 255, 0.3) var(--progress, 0%));
}

.seek-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.seek-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
}

.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 80px;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(
    to right,
    white var(--volume-progress, 0%),
    rgba(255, 255, 255, 0.3) var(--volume-progress, 0%)
  );
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
}
</style>
