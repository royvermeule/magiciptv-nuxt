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
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
  nextSrc?: string | null;
  prevSrc?: string | null;
}>();

const emit = defineEmits<{
  prevEpisode: [];
  nextEpisode: [];
}>();

// const { currentMedia, setCurrentMedia, unsetCurrentMedia } = usePlayer();

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
const needsManualPlay = ref(false);
let currentBlobUrl: string | null = null;
const activeCueText = ref<string | null>(null);
// map label -> OpenSubtitles fileId for tracks added from /api/subtitles
const subtitleLabelToFileId = new Map<string, number>();

// use the DOM TextTrack (tracks from `el.textTracks`) — don't import
// vidstack's internal TextTrack type which contains a private field
// that makes assignments incompatible.
// Minimal track shape used at runtime (covers vidstack/dom track wrappers).
type PlayerTextTrack = {
  id?: string;
  kind?: string;
  label?: string;
  language?: string;
  mode?: "disabled" | "hidden" | "showing";
  cues?: {
    length: number;
    [index: number]: any;
  } & Iterable<any> | null;
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
};

let activeSubTrack: PlayerTextTrack | null = null;
let activeSubTrackCueHandler: ((this: PlayerTextTrack, ev: Event) => void) | null = null;

function updateActiveCueNow() {
  activeCueText.value = null;
  if (!activeSubTrack)
    return;

  const ct = player.value?.currentTime ?? currentTime.value;
  if (!activeSubTrack.cues)
    return;

  let found: string | null = null;
  for (let i = 0; i < activeSubTrack.cues.length; i++) {
    const cue = activeSubTrack.cues[i] as any;
    if (!cue)
      continue;
    if (ct >= cue.startTime && ct <= cue.endTime) {
      const text = cue.text;
      if (text)
        found = found ? `${found}<br>${text}` : text;
    }
  }

  activeCueText.value = found;
}

function setActiveSubTrack(track: PlayerTextTrack | null) {
  if (activeSubTrack && activeSubTrackCueHandler) {
    activeSubTrack.removeEventListener?.("cuechange", activeSubTrackCueHandler as EventListener);
  }

  activeSubTrack = track;
  activeSubTrackCueHandler = null;

  if (track) {
    activeSubTrackCueHandler = function (this: PlayerTextTrack, ev: Event) {
      void ev;
      updateActiveCueNow();
    };
    track.addEventListener?.("cuechange", activeSubTrackCueHandler as EventListener);

    // immediate update so the overlay reflects the current time
    updateActiveCueNow();
  }
  else {
    activeCueText.value = null;
  }
}

/**
 * Remove previously-added external subtitle <track> elements (those
 * loaded from /api/subtitles/download) and clear associated state so
 * a newly-loaded episode can fetch its own subtitle candidates.
 */
function clearExternalSubtitleTracks() {
  const el = player.value;
  if (!el)
    return;

  const v = el.querySelector("video") as HTMLVideoElement | null;
  if (v) {
    const tracks = Array.from(v.querySelectorAll("track"));
    for (const t of tracks) {
      const kind = t.kind || t.getAttribute("kind");
      const src = t.src || t.getAttribute("src") || "";
      if ((kind === "subtitles" || kind === "captions") && src.includes("/api/subtitles/download")) {
        t.remove();
      }
    }
  }

  // Also remove tracks from vidstack's textTracks list (the source we
  // actually use to build the subtitle menu). Prefer removing only the
  // tracks that were added from our /api/subtitles endpoint; if the
  // TextTrackList API supports `remove(track)` use that, otherwise
  // fall back to `clear()` as a last resort.
  const ttList: any = el.textTracks;
  if (ttList && typeof ttList.remove === "function") {
    for (const t of Array.from(el.textTracks as any)) {
      const src = (t as any).src || "";
      if (typeof src === "string" && src.includes("/api/subtitles/download")) {
        ttList.remove(t);
      }
    }
  }

  // clear our helpers/state and update the UI
  subtitleLabelToFileId.clear();
  setActiveSubTrack(null);
  refreshSubtitleTracks();
}

const internalSrc = ref<string | null>(props.src ?? null);
const proxiedSrc = computed(() => internalSrc.value);

let hideTimer: ReturnType<typeof setTimeout>;
let unsubscribe: (() => void) | undefined;

const { startTracking, updateProgress, stopTracking } = useWatchHistory();
const { consumeEnterPlayerFullscreen } = usePlayerIntent();

const showSeek = computed(() => props.type === "movie" || props.type === "series");
const isLive = computed(() => props.type === "live");

async function goBack() {
  if (document.fullscreenElement) {
    // prefer the standard API but fall back to vendor-prefixed exit
    await document.exitFullscreen?.().catch(() => (document as any).webkitExitFullscreen?.());

    const { exit } = useFullscreen();
    await exit(500);
    isFullscreen.value = !!document.fullscreenElement;
  }

  router.back();
}

function goPrevEpisode() {
  stopTracking();
  if (props.hasPrevEpisode && props.prevSrc && player.value) {
    // remove any external subtitle tracks from the previous episode so
    // the new episode can fetch its own candidates
    clearExternalSubtitleTracks();
    internalSrc.value = props.prevSrc;
    currentTime.value = 0;
    duration.value = 0;
    needsManualPlay.value = false;
    if (player.value) {
      player.value.play().catch(() => {});
    }
    const onCanPlayPrev = () => {
      if (player.value)
        player.value.play().catch(() => {});
    };
    player.value?.addEventListener("can-play", onCanPlayPrev, { once: true });
  }
  emit("prevEpisode");
  resetHideTimer();
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}
function goNextEpisode() {
  stopTracking(true);
  // if parent provided a prefetched next-src, switch immediately and play
  if (props.hasNextEpisode && props.nextSrc && player.value) {
    // remove subtitle tracks from the previous episode so they don't
    // remain in the subtitle menu for the next episode
    clearExternalSubtitleTracks();
    internalSrc.value = props.nextSrc;
    currentTime.value = 0;
    duration.value = 0;
    needsManualPlay.value = false;
    // try to play immediately (user gesture). also attach a can-play
    // listener as a fallback in case the provider isn't ready yet.
    if (player.value) {
      player.value.play().catch(() => {});
    }
    const onCanPlayNext = () => {
      if (player.value)
        player.value.play().catch(() => {});
    };
    player.value?.addEventListener("can-play", onCanPlayNext, { once: true });
  }
  emit("nextEpisode");
  resetHideTimer();
}

function manualPlay() {
  needsManualPlay.value = false;
  player.value?.play();
  container.value?.requestFullscreen().catch(() => {
    isFullscreen.value = true;
  });
}

async function fetchOpenSubtitles() {
  if (isLive.value || !props.title)
    return;

  const el = player.value;
  if (!el)
    return;

  // Skip if the stream already provides subtitle tracks
  const existing = [...el.textTracks].filter(t => t.kind === "subtitles" || t.kind === "captions");
  if (import.meta.env.DEV) {
    console.warn("fetchOpenSubtitles — existing textTracks:", existing.map((t: any) => ({ id: t.id, label: t.label, src: t.src || null, cues: t.cues?.length ?? 0 })));
  }

  // If there's at least one *valid* subtitle/caption track (has a
  // src or loaded cues) assume the provider supplied subtitles and
  // don't fetch. If tracks exist but have no src/cues (stale or
  // placeholder entries), proceed to fetch candidates.
  const hasValidTrack = existing.some((t: any) => {
    const src = (t as any).src || "";
    const cues = (t as any).cues;
    return (typeof src === "string" && src.trim() !== "") || (cues && cues.length > 0);
  });
  if (existing.length > 0 && hasValidTrack) {
    if (import.meta.env.DEV)
      console.warn("fetchOpenSubtitles — skipping because provider/subtitles already present");
    return;
  }

  // For series use the series name (not the episode title) for better search results
  const searchTitle = (props.type === "series" && props.seriesName) ? props.seriesName : props.title;

  const searchQuery: Record<string, string | number> = {
    query: searchTitle,
    type: props.type ?? "movie",
  };
  if (props.type === "series") {
    if (props.seasonNumber)
      searchQuery.seasonNumber = props.seasonNumber;
    if (props.episodeNumber)
      searchQuery.episodeNumber = props.episodeNumber;
  }

  const durationSec = Math.floor(el.duration || 0);

  // Ask the server to pick the best candidate (server probes/caches
  // subtitle metadata and returns a ranked list + confidence).
  // Try server-side best-candidate selection first. If it fails or
  // returns no candidates, fall back to the legacy /search flow so the
  // UI still shows subtitle options.
  const bestResp = await $fetch<any>("/api/subtitles/best", { query: { ...searchQuery, duration: durationSec } }).catch(() => null);

  if (bestResp && Array.isArray(bestResp.candidates) && bestResp.candidates.length > 0) {
    const highConfidence = bestResp.confidence === "high" || ((bestResp.best?.coverage ?? 0) >= 0.8 && !bestResp.best?.isOutlier && bestResp.best?.verifiable) || (bestResp.confidenceScore ?? 0) >= 0.55;

    // Prefer verifiable, non-outlier candidates only. If the server
    // returned any verifiable candidates we will show only those.
    const verifiableCandidates = (bestResp.candidates ?? []).filter((c: any) => !c.isOutlier && Boolean(c.verifiable));
    if (verifiableCandidates.length > 0) {
      const toAdd = (bestResp.best && bestResp.best.verifiable) ? [bestResp.best] : verifiableCandidates;
      for (const sub of toAdd) {
        const label = sub.label;
        el.textTracks.add({ src: `/api/subtitles/download?fileId=${sub.fileId}`, kind: "subtitles", label, language: sub.language, type: "vtt" });
        subtitleLabelToFileId.set(label, sub.fileId);
      }
      refreshSubtitleTracks();
      if (highConfidence && bestResp.best?.verifiable) {
        useToast().show(`Subtitles auto‑selected (${bestResp.best?.label})`);
      }
      return;
    }

    // No verifiable candidates found — expose the full list of
    // returned candidates (marked "unverified") so the user can
    // manually pick the subtitle that actually matches their stream.
    const candidates = bestResp.candidates ?? [];
    for (const c of candidates) {
      const label = `${c.label}${c.verifiable ? "" : " (unverified)"}`;
      el.textTracks.add({ src: `/api/subtitles/download?fileId=${c.fileId}`, kind: "subtitles", label, language: c.language, type: "vtt" });
    }
    refreshSubtitleTracks();
    useToast().show("Showing unverified subtitle candidates — pick one to try");
    return;
  }

  // Fallback: call the original search endpoint and add returned candidates
  const legacy = await $fetch<{ fileId: number; language: string; label: string }[]>("/api/subtitles/search", { query: searchQuery }).catch(() => null);
  if (!legacy || !legacy.length)
    return;
  for (const sub of legacy) {
    el.textTracks.add({ src: `/api/subtitles/download?fileId=${sub.fileId}`, kind: "subtitles", label: sub.label, language: sub.language, type: "vtt" });
  }
  refreshSubtitleTracks();
}

onMounted(() => {
  const el = player.value;
  if (!el)
    return;

  // Ensure the video element is constrained to the container so it
  // letterboxes instead of overflowing/cropping on non-16:9 screens.
  const applyVideoFit = () => {
    const v = el.querySelector("video");
    if (v) {
      v.style.setProperty("max-width", "100%", "important");
      v.style.setProperty("max-height", "100%", "important");
      v.style.setProperty("width", "100%", "important");
      v.style.setProperty("height", "100%", "important");
      v.style.setProperty("object-fit", "contain", "important");
    }
  };
  applyVideoFit();
  const observer = new MutationObserver(applyVideoFit);
  observer.observe(el, { childList: true, subtree: true });
  onUnmounted(() => observer.disconnect());

  unsubscribe = el.subscribe(({ paused, currentTime: ct, duration: dur, volume: vol, muted }) => {
    isPlaying.value = !paused;
    currentTime.value = ct;
    duration.value = dur;
    volume.value = vol;
    isMuted.value = muted;
    updateProgress(ct, dur);

    // Manually resolve active subtitle cue (use track timing)
    if (activeSubTrack?.cues) {
      const adjusted = ct;
      let found: string | null = null;
      for (const cue of activeSubTrack.cues) {
        if (adjusted >= cue.startTime && adjusted <= cue.endTime) {
          const text = (cue as any).text;
          if (text)
            found = found ? `${found}<br>${text}` : text;
        }
      }
      activeCueText.value = found;
    }
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
    });
  }

  el.textTracks.addEventListener("add", () => refreshSubtitleTracks());
  el.textTracks.addEventListener("remove", () => refreshSubtitleTracks());

  el.addEventListener("error", (ev: Event) => {
    const v = el.querySelector("video") as HTMLVideoElement | null;
    // provider error — intentionally not logging in production
    void ev;
    void v?.error;
    void props.src;
  });

  el.addEventListener("can-play", async () => {
    if (props.streamId && !isLive.value) {
      const progress = await $fetch("/api/watch-history/progress", {
        query: { streamId: props.streamId, type: props.type },
      }).catch(() => null);
      if (progress?.currentTime && progress.currentTime > 0) {
        el.currentTime = progress.currentTime;
      }
    }

    // Fetch subtitles from OpenSubtitles if stream has none
    // ensure any stale external tracks are removed before fetching
    // candidates for the newly-loaded media
    clearExternalSubtitleTracks();
    fetchOpenSubtitles();
    // If navigation originated from a "play+fullscreen" gesture, try to
    // transfer fullscreen to the player container here so the player UI
    // itself becomes fullscreen (better UX than a random anchor element
    // remaining fullscreen). Session flag is set by the pages that link
    // into /hub/watch.
    const enterFs = consumeEnterPlayerFullscreen();
    if (enterFs) {
      await container.value?.requestFullscreen?.().catch(() => {});
    }

    try {
      await el.play();
    }
    catch {
      needsManualPlay.value = true;
    }
  }, { once: true });

  // subtitle offset persistence removed — external subtitle timing is used as-is
});

watch(() => props.src, (newSrc) => {
  // if the player already has this source (we may have switched to a
  // prefetched next/prev URL synchronously), avoid resetting/pausing
  // the provider — let playback continue uninterrupted.
  const v = player.value?.querySelector("video") as HTMLVideoElement | null;
  if ((v?.currentSrc && newSrc && v.currentSrc === newSrc) || internalSrc.value === newSrc) {
    return;
  }

  // keep internal src in sync with incoming prop
  internalSrc.value = newSrc ?? null;
  // ensure any external subtitle tracks from the previous media are removed
  // so fetchOpenSubtitles() can run for the newly loaded source.
  clearExternalSubtitleTracks();
  // If navigation carried an intent for the player to be fullscreen,
  // transfer fullscreen to the player container when the source
  // changes (covers the case where AppPlayer stays mounted across
  // episode navigation).
  const enterFsNow = consumeEnterPlayerFullscreen();
  if (enterFsNow) {
    container.value?.requestFullscreen?.().catch(() => {});
  }
  const wasPlaying = isPlaying.value;

  currentTime.value = 0;
  duration.value = 0;
  needsManualPlay.value = false;
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }

  if (player.value) {
    player.value.pause();
    player.value.currentTime = 0;

    // Ensure we restore any saved progress and fetch subtitles for the
    // newly-loaded source once the provider is ready to play.
    const onCanPlayForNewSrc = async () => {
      if (props.streamId && !isLive.value) {
        const progress = await $fetch("/api/watch-history/progress", {
          query: { streamId: props.streamId, type: props.type },
        }).catch(() => null);
        if (progress?.currentTime && progress.currentTime > 0 && player.value) {
          player.value.currentTime = progress.currentTime;
        }
      }

      // attempt to fetch external subtitles for the new media
      fetchOpenSubtitles();
    };
    player.value?.addEventListener("can-play", onCanPlayForNewSrc, { once: true });

    // If the provider hasn't fired `can-play` yet but there are no
    // subtitle tracks available, try fetching candidates now as a
    // best-effort (the can-play listener will also run once the
    // provider is ready). This prevents a briefly-empty menu when the
    // provider's events happen slightly out-of-order.
    Promise.resolve().then(() => {
      const existing = [...(player.value?.textTracks ?? [])].filter((t: any) => t.kind === "subtitles" || t.kind === "captions");
      if (existing.length === 0)
        fetchOpenSubtitles();
    });

    const shouldAutoPlay = wasPlaying;
    if (shouldAutoPlay) {
      const tryPlayNow = async () => {
        try {
          await player.value?.play();
          return true;
        }
        catch {
          return false;
        }
      };

      tryPlayNow().then((didPlay) => {
        if (!didPlay) {
          const onCanPlay = async () => {
            try {
              await player.value?.play();
            }
            catch {
              needsManualPlay.value = true;
            }
          };
          player.value?.addEventListener("can-play", onCanPlay, { once: true });
        }
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
    });
  }

  // After the parent updates the streamId (page navigation), ensure
  // subtitle tracks are refreshed for the newly-selected episode.
  // If the provider isn't ready yet, attach a one-time can-play
  // listener; otherwise try a best-effort fetch immediately.
  clearExternalSubtitleTracks();
  const el = player.value;
  if (el) {
    const existing = [...(el.textTracks ?? [])].filter((t: any) => t.kind === "subtitles" || t.kind === "captions");
    const hasValid = existing.some((t: any) => {
      const src = t.src || "";
      const cues = t.cues;
      return (typeof src === "string" && src.trim() !== "") || (cues && cues.length > 0);
    });

    const runFetch = () => fetchOpenSubtitles();

    if (!hasValid) {
      // provider hasn't supplied subtitles for the new media yet —
      // fetch candidates now and again once the provider signals
      // readiness.
      runFetch();
      el.addEventListener("can-play", runFetch, { once: true });
    }
  }
});

onUnmounted(() => {
  stopTracking();
  unsubscribe?.();
  clearTimeout(hideTimer);
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  // Ensure fullscreen is exited when the player is removed from the DOM
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  setActiveSubTrack(null);
});

function seekBackward() {
  if (player.value) {
    player.value.currentTime = Math.max(0, player.value.currentTime - 10);
  }
  resetHideTimer();
}

function seekForward() {
  if (player.value) {
    player.value.currentTime += 10;
  }
  resetHideTimer();
}

function togglePlay() {
  if (!player.value)
    return;
  if (player.value.paused) {
    player.value.play().catch(() => {});
    if (!document.fullscreenElement) {
      container.value?.requestFullscreen().catch(() => {});
    }
  }
  else {
    player.value.pause();
  }
  resetHideTimer();
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
  if (!player.value)
    return;
  player.value.muted = !player.value.muted;
  resetHideTimer();
}

function onVolumeInput(e: Event) {
  const val = (e.target as HTMLInputElement).valueAsNumber;
  if (!player.value)
    return;
  player.value.volume = val;
  if (val > 0 && player.value.muted)
    player.value.muted = false;
  resetHideTimer();
}

type SubtitleTrack = {
  id: string;
  label: string;
  language: string;
  track: PlayerTextTrack;
};

const subtitleTracks = ref<SubtitleTrack[]>([]);
const activeSubtitleId = ref<string | null>(null);
const subtitleMenuOpen = ref(false);
const showSubtitles = computed(() => !isLive.value);
// (fileId is parsed from the added <track> src when needed)

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
        track: track as unknown as PlayerTextTrack,
      });
    }
  }
  subtitleTracks.value = tracks;

  // consider both `hidden` and `showing` as "selected" so our UI
  // treats tracks that are loaded but rendered by the page (hidden)
  // as active. We render cues in our own overlay and therefore set
  // tracks to `hidden` when selected (prevents native rendering,
  // enables cue access for our overlay rendering).
  const active = tracks.find(t => t.track.mode === "showing" || t.track.mode === "hidden");
  activeSubtitleId.value = active?.id ?? null;
  // ensure our activeSubTrack is kept in sync with the UI selection
  setActiveSubTrack(active?.track ?? null);
}

function selectSubtitle(id: string | null) {
  const el = player.value;
  if (!el) {
    return;
  }

  activeCueText.value = null;
  setActiveSubTrack(null);

  for (const track of el.textTracks) {
    if (track.kind === "subtitles" || track.kind === "captions") {
      track.mode = "disabled";
    }
  }

  if (id) {
    const selected = subtitleTracks.value.find(t => t.id === id);
    if (selected) {
      // keep the browser from drawing the native captions (we render
      // them in our overlay)
      selected.track.mode = "hidden";
      setActiveSubTrack(selected.track);
    }
  }
  // keep the current selection
  activeSubtitleId.value = id;
  subtitleMenuOpen.value = false;
  resetHideTimer();
}

// Subtitle sync/offset/persistence removed — selected external subtitle
// files are authoritative. Manual sync UI and localStorage handling
// were removed to avoid conflicting adjustments when multiple
// candidate subtitle tracks are available.

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
