<script setup lang="ts">
import type { MediaPlayerElement } from "vidstack/elements";

import "vidstack/player";
import "vidstack/player/styles/default/theme.css";

const props = defineProps<{
  src?: string | null;
  title?: string;
  poster?: string;
  type?: "live" | "movie" | "series";
  streamId?: number;
  seriesName?: string;
  seriesId?: number;
  seasonNumber?: string;
  episodeNumber?: number;
  containerExtension?: string;
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
  nextSrc?: string | null;
  prevSrc?: string | null;
}>();

const emit = defineEmits<{
  prevEpisode: [];
  nextEpisode: [];
}>();

const router = useRouter();
const player = ref<MediaPlayerElement>();
const container = ref<HTMLElement>();
const isPlaying = ref(false);
const isFullscreen = ref(false);
const needsManualPlay = ref(false);
let currentBlobUrl: string | null = null;
let unsubscribe: (() => void) | undefined;

const internalSrc = ref<string | null>(props.src ?? null);

const proxiedSrc = computed(() => {
  const src = internalSrc.value;
  if (!src)
    return null;
  // Live → HLS.js (uses fetch internally, needs CORS — stays proxied)
  if (props.type === "live") {
    return { src, type: "application/x-mpegURL" };
  }
  // Movies/series → native <video> element. Provide video/mp4 so Vidstack
  // picks the native video provider immediately without a HEAD probe.
  // The proxy issues a 302 redirect to the IPTV URL for GET requests,
  // so the browser streams directly (no CORS enforcement on <video> src).
  return { src, type: "video/mp4" };
});

const showSeek = computed(() => props.type === "movie" || props.type === "series");
const isLive = computed(() => props.type === "live");
const showSubtitles = computed(() => !isLive.value);

// --- composables ---
const { startTracking, updateProgress, stopTracking, restoreProgress } = useWatchHistory();
const { consumeEnterPlayerFullscreen } = usePlayerIntent();

const subtitles = useSubtitles(player, {
  type: props.type,
  title: props.title,
  seriesName: props.seriesName,
  seasonNumber: props.seasonNumber,
  episodeNumber: props.episodeNumber,
});
const {
  subtitleTracks,
  activeSubtitleId,
  subtitleMenuOpen,
  activeCueText,
  clearExternalSubtitleTracks,
  fetchOpenSubtitles,
  setupTrackListeners,
  dispose: disposeSubtitles,
} = subtitles;

const controls = usePlayerControls(isPlaying, () => {
  subtitleMenuOpen.value = false;
});
const { controlsVisible, showControlsTemporarily, hideControls, resetHideTimer } = controls;

const seek = useSeek(player, resetHideTimer);
const { currentTime, duration, displayTime, progress, onSeekStart, onSeekInput, seekBackward, seekForward, formatTime, setTime } = seek;
const onSeekEnd = seek.onSeekEnd;

const vol = useVolume(player, resetHideTimer);
const { volume, isMuted, volumeIcon, volumeProgress, toggleMute, onVolumeInput, setVolumeState } = vol;
// ensure video element is sized correctly and kept in sync when providers change
useVideoFit(player);
const { manualPlay, togglePlay } = usePlayerActions(player, container, isFullscreen, needsManualPlay, resetHideTimer);

// Thin wrappers for subtitle actions that also reset the hide timer
function toggleSubtitleMenu() {
  subtitles.toggleSubtitleMenu();
  resetHideTimer();
}

function selectSubtitle(id: string | null) {
  subtitles.selectSubtitle(id);
  resetHideTimer();
}

// --- fullscreen ---
function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

async function toggleFullscreen() {
  const el = container.value;
  if (!el)
    return;
  if (!document.fullscreenElement) {
    await el.requestFullscreen().catch(() => {
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

// --- navigation ---
async function goBack() {
  if (document.fullscreenElement) {
    await document.exitFullscreen?.().catch(() => (document as any).webkitExitFullscreen?.());
    const { exit } = useFullscreen();
    await exit(500);
    isFullscreen.value = !!document.fullscreenElement;
  }
  router.back();
}

// Shared helper to switch the internal source and perform the
// common reset/play work that prev/next and other navigations use.
function setInternalSource(src: string | null, autoplay = true) {
  clearExternalSubtitleTracks();
  internalSrc.value = src;
  resetPlaybackState();

  if (!player.value)
    return;

  player.value.pause();
  player.value.currentTime = 0;

  if (autoplay) {
    void safePlay(player.value);
    player.value.addEventListener("can-play", () => void safePlay(player.value), { once: true });
  }
}

function resetPlaybackState() {
  currentTime.value = 0;
  duration.value = 0;
  needsManualPlay.value = false;
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
}

// attempt to play a player instance without throwing; returns true
// when playback starts, false otherwise.
async function safePlay(p?: MediaPlayerElement | null) {
  const el = p ?? player.value;
  if (!el)
    return false;
  try {
    await el.play();
    return true;
  }
  catch {
    return false;
  }
}

async function ensureEnterPlayerFullscreenIfNeeded() {
  const enterFs = consumeEnterPlayerFullscreen();
  if (enterFs)
    await container.value?.requestFullscreen?.().catch(() => {});
}

function goPrevEpisode() {
  stopTracking();
  if (props.hasPrevEpisode && props.prevSrc && player.value) {
    setInternalSource(props.prevSrc);
  }
  emit("prevEpisode");
  resetHideTimer();
}

function goNextEpisode() {
  stopTracking(true);
  if (props.hasNextEpisode && props.nextSrc && player.value) {
    setInternalSource(props.nextSrc);
  }
  emit("nextEpisode");
  resetHideTimer();
}

// manualPlay/togglePlay provided by usePlayerActions

// --- lifecycle ---
function handlePlayerUpdate({ paused, currentTime: ct, duration: dur, volume: v, muted }: any) {
  isPlaying.value = !paused;
  setTime(ct, dur);
  setVolumeState(v, muted);
  updateProgress(ct, dur);
  subtitles.onTimeUpdate(ct);
}

function onPlayerError(ev: Event) {
  const v = player.value?.querySelector("video") as HTMLVideoElement | null;
  // provider error — intentionally not logging in production
  void ev;
  void v?.error;
  void props.src;
}

onMounted(() => {
  const el = player.value;
  if (!el)
    return;

  // video fit handled by useVideoFit(player)

  unsubscribe = el.subscribe(({ paused, currentTime: ct, duration: dur, volume: v, muted }) => {
    handlePlayerUpdate({ paused, currentTime: ct, duration: dur, volume: v, muted });
  });

  document.addEventListener("fullscreenchange", onFullscreenChange);
  isFullscreen.value = !!document.fullscreenElement;

  if (props.streamId && !isLive.value) {
    startTracking({
      streamId: props.streamId,
      type: props.type as "movie" | "series",
      title: props.title ?? "",
      icon: props.poster,
      seriesName: props.seriesName,
      seriesId: props.seriesId,
      seasonNumber: props.seasonNumber,
      episodeNumber: props.episodeNumber,
      containerExtension: props.containerExtension,
    });
  }

  setupTrackListeners();

  el.addEventListener("error", onPlayerError);

  el.addEventListener("can-play", async () => {
    if (props.streamId && !isLive.value) {
      const savedTime = await restoreProgress(props.streamId, props.type as "movie" | "series");
      if (savedTime > 0)
        el.currentTime = savedTime;
    }
    clearExternalSubtitleTracks();
    fetchOpenSubtitles();
    await ensureEnterPlayerFullscreenIfNeeded();
    const didPlay = await safePlay(el);
    if (!didPlay)
      needsManualPlay.value = true;
  }, { once: true });
});

watch(() => props.src, (newSrc) => {
  const v = player.value?.querySelector("video") as HTMLVideoElement | null;
  if ((v?.currentSrc && newSrc && v.currentSrc === newSrc) || internalSrc.value === newSrc)
    return;

  internalSrc.value = newSrc ?? null;
  clearExternalSubtitleTracks();

  // maybe transfer fullscreen to the player container if navigation
  // carried that intent (don't await here — non-blocking)
  void ensureEnterPlayerFullscreenIfNeeded();

  const wasPlaying = isPlaying.value;
  resetPlaybackState();

  if (player.value) {
    player.value.pause();
    player.value.currentTime = 0;

    player.value.addEventListener("can-play", async () => {
      if (props.streamId && !isLive.value) {
        const savedTime = await restoreProgress(props.streamId, props.type as "movie" | "series");
        if (savedTime > 0 && player.value)
          player.value.currentTime = savedTime;
      }
      fetchOpenSubtitles();
    }, { once: true });

    Promise.resolve().then(() => {
      const existing = [...(player.value?.textTracks ?? [])].filter((t: any) => t.kind === "subtitles" || t.kind === "captions");
      if (existing.length === 0)
        fetchOpenSubtitles();
    });

    if (wasPlaying) {
      player.value.play().catch(() => {
        player.value?.addEventListener("can-play", async () => {
          try {
            await player.value?.play();
          }
          catch {
            needsManualPlay.value = true;
          }
        }, { once: true });
      });
    }
  }
});

watch(() => props.streamId, (id) => {
  stopTracking();
  if (id && !isLive.value) {
    startTracking({
      streamId: id,
      type: props.type as "movie" | "series",
      title: props.title ?? "",
      icon: props.poster,
      seriesName: props.seriesName,
      seriesId: props.seriesId,
      seasonNumber: props.seasonNumber,
      episodeNumber: props.episodeNumber,
      containerExtension: props.containerExtension,
    });
  }

  clearExternalSubtitleTracks();
  const el = player.value;
  if (el) {
    const existing = [...(el.textTracks ?? [])].filter((t: any) => t.kind === "subtitles" || t.kind === "captions");
    const hasValid = existing.some((t: any) => {
      const src = t.src || "";
      const cues = t.cues;
      return (typeof src === "string" && src.trim() !== "") || (cues && cues.length > 0);
    });
    if (!hasValid) {
      fetchOpenSubtitles();
      el.addEventListener("can-play", () => fetchOpenSubtitles(), { once: true });
    }
  }
});

onUnmounted(() => {
  stopTracking();
  unsubscribe?.();
  controls.dispose();
  disposeSubtitles();
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  if (document.fullscreenElement)
    document.exitFullscreen();
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
});
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
      :src="proxiedSrc"
      :title="title"
      playsinline
    >
      <media-provider />
    </media-player>

    <!-- Manual play overlay (shown when autoplay is blocked) -->
    <div
      v-if="needsManualPlay"
      class="absolute inset-0 z-30 flex cursor-pointer items-center justify-center bg-black/60"
      @click="manualPlay"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="flex size-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <Icon name="tabler:player-play-filled" size="40" class="text-white" />
        </div>
        <span class="text-sm text-white/80">Tap to play</span>
      </div>
    </div>

    <!-- Subtitle overlay — above touch-capture (z-10), below controls (z-20) -->
    <div v-if="activeCueText" class="subtitle-overlay" v-html="activeCueText" />

    <div
      class="touch-capture"
      @pointerdown="showControlsTemporarily"
      @pointermove="showControlsTemporarily"
    />

    <div
      class="controls-layer"
      :class="controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'"
      @pointermove="showControlsTemporarily"
    >
      <div class="flex h-8 shrink-0 items-center gap-2 bg-linear-to-b from-black/50 to-transparent px-3 sm:h-16 sm:px-4" @click="hideControls">
        <button
          class="flex shrink-0 cursor-pointer items-center justify-center rounded-full p-1 text-white transition-colors hover:bg-white/20"
          @click.stop="goBack"
        >
          <Icon name="tabler:arrow-left" size="28" />
        </button>
        <span v-if="title" class="truncate text-sm text-white sm:text-base" @click.stop>{{ title }}</span>
      </div>

      <div class="flex flex-1 items-center justify-center gap-4 sm:gap-8" @click="hideControls">
        <button
          v-if="hasPrevEpisode"
          class="flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 sm:p-3"
          @click.stop="goPrevEpisode"
        >
          <Icon name="tabler:player-skip-back-filled" class="size-5 sm:size-6" />
        </button>

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

        <button
          v-if="hasNextEpisode"
          class="flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 sm:p-3"
          @click.stop="goNextEpisode"
        >
          <Icon name="tabler:player-skip-forward-filled" class="size-5 sm:size-6" />
        </button>
      </div>

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
            <div v-if="showSubtitles" class="relative">
              <button
                class="rounded p-1 text-white transition-colors hover:bg-white/20"
                :class="activeSubtitleId ? 'text-primary' : ''"
                @click="toggleSubtitleMenu"
              >
                <Icon name="tabler:message-language" size="20" />
              </button>

              <div
                v-if="subtitleMenuOpen"
                class="absolute bottom-full right-0 mb-2 max-h-60 min-w-40 overflow-y-auto rounded-lg bg-base-300/95 py-1 shadow-lg backdrop-blur-sm"
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
                  <!-- subtitle sync controls removed: external subtitle files are authoritative -->
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
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Custom subtitle overlay — above touch-capture (z-10), below controls (z-20) */
.subtitle-overlay {
  position: absolute;
  bottom: 12%;
  left: 5%;
  right: 5%;
  z-index: 15;
  text-align: center;
  color: white;
  font-size: clamp(14px, 2.5vw, 22px);
  line-height: 1.4;
  text-shadow:
    0 1px 4px rgba(0, 0, 0, 0.9),
    0 0 2px rgba(0, 0, 0, 0.7);
  pointer-events: none;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 12px;
  border-radius: 4px;
  width: fit-content;
  margin: 0 auto;
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
