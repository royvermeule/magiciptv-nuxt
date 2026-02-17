import type { MediaPlayerElement } from "vidstack/elements";

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

type SubtitleTrack = {
  id: string;
  label: string;
  language: string;
  track: PlayerTextTrack;
};

type SubtitleProps = {
  type?: "live" | "movie" | "series";
  title?: string;
  seriesName?: string;
  seasonNumber?: string;
  episodeNumber?: number;
};

export function useSubtitles(player: Ref<MediaPlayerElement | undefined>, props: SubtitleProps) {
  const subtitleTracks = ref<SubtitleTrack[]>([]);
  const activeSubtitleId = ref<string | null>(null);
  const subtitleMenuOpen = ref(false);
  const activeCueText = ref<string | null>(null);

  // map label -> OpenSubtitles fileId for tracks added from /api/subtitles
  const subtitleLabelToFileId = new Map<string, number>();

  let activeSubTrack: PlayerTextTrack | null = null;
  let activeSubTrackCueHandler: ((this: PlayerTextTrack, ev: Event) => void) | null = null;

  function updateActiveCueNow(currentTime?: number) {
    activeCueText.value = null;
    if (!activeSubTrack)
      return;

    const ct = currentTime ?? player.value?.currentTime ?? 0;
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
      updateActiveCueNow();
    }
    else {
      activeCueText.value = null;
    }
  }

  function refreshSubtitleTracks() {
    const el = player.value;
    if (!el)
      return;

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

    const active = tracks.find(t => t.track.mode === "showing" || t.track.mode === "hidden");
    activeSubtitleId.value = active?.id ?? null;
    setActiveSubTrack(active?.track ?? null);
  }

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

    const ttList: any = el.textTracks;
    if (ttList && typeof ttList.remove === "function") {
      for (const t of Array.from(el.textTracks as any)) {
        const src = (t as any).src || "";
        if (typeof src === "string" && src.includes("/api/subtitles/download")) {
          ttList.remove(t);
        }
      }
    }

    subtitleLabelToFileId.clear();
    setActiveSubTrack(null);
    refreshSubtitleTracks();
  }

  async function fetchOpenSubtitles() {
    const isLive = props.type === "live";
    if (isLive || !props.title)
      return;

    const el = player.value;
    if (!el)
      return;

    const existing = [...el.textTracks].filter(t => t.kind === "subtitles" || t.kind === "captions");

    const hasValidTrack = existing.some((t: any) => {
      const src = (t as any).src || "";
      const cues = (t as any).cues;
      return (typeof src === "string" && src.trim() !== "") || (cues && cues.length > 0);
    });
    if (existing.length > 0 && hasValidTrack)
      return;

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

    const bestResp = await $fetch<any>("/api/subtitles/best", {
      query: { ...searchQuery, duration: durationSec },
    }).catch(() => null);

    if (bestResp && Array.isArray(bestResp.candidates) && bestResp.candidates.length > 0) {
      const highConfidence
        = bestResp.confidence === "high"
          || ((bestResp.best?.coverage ?? 0) >= 0.8 && !bestResp.best?.isOutlier && bestResp.best?.verifiable)
          || (bestResp.confidenceScore ?? 0) >= 0.55;

      const verifiableCandidates = (bestResp.candidates ?? []).filter((c: any) => !c.isOutlier && Boolean(c.verifiable));
      if (verifiableCandidates.length > 0) {
        const toAdd = (bestResp.best && bestResp.best.verifiable) ? [bestResp.best] : verifiableCandidates;
        for (const sub of toAdd) {
          el.textTracks.add({ src: `/api/subtitles/download?fileId=${sub.fileId}`, kind: "subtitles", label: sub.label, language: sub.language, type: "vtt" });
          subtitleLabelToFileId.set(sub.label, sub.fileId);
        }
        refreshSubtitleTracks();
        if (highConfidence && bestResp.best?.verifiable) {
          useToast().show(`Subtitles auto-selected (${bestResp.best?.label})`);
        }
        return;
      }

      const candidates = bestResp.candidates ?? [];
      for (const c of candidates) {
        const label = `${c.label}${c.verifiable ? "" : " (unverified)"}`;
        el.textTracks.add({ src: `/api/subtitles/download?fileId=${c.fileId}`, kind: "subtitles", label, language: c.language, type: "vtt" });
      }
      refreshSubtitleTracks();
      useToast().show("Showing unverified subtitle candidates — pick one to try");
      return;
    }

    const legacy = await $fetch<{ fileId: number; language: string; label: string }[]>("/api/subtitles/search", {
      query: searchQuery,
    }).catch(() => null);
    if (!legacy || !legacy.length)
      return;
    for (const sub of legacy) {
      el.textTracks.add({ src: `/api/subtitles/download?fileId=${sub.fileId}`, kind: "subtitles", label: sub.label, language: sub.language, type: "vtt" });
    }
    refreshSubtitleTracks();
  }

  function selectSubtitle(id: string | null) {
    const el = player.value;
    if (!el)
      return;

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
        selected.track.mode = "hidden";
        setActiveSubTrack(selected.track);
      }
    }

    activeSubtitleId.value = id;
    subtitleMenuOpen.value = false;
  }

  function toggleSubtitleMenu() {
    subtitleMenuOpen.value = !subtitleMenuOpen.value;
    if (subtitleMenuOpen.value) {
      refreshSubtitleTracks();
    }
  }

  // Called from the player time-update subscription so cues stay in sync
  function onTimeUpdate(ct: number) {
    if (activeSubTrack?.cues) {
      let found: string | null = null;
      for (const cue of activeSubTrack.cues) {
        if (ct >= cue.startTime && ct <= cue.endTime) {
          const text = (cue as any).text;
          if (text)
            found = found ? `${found}<br>${text}` : text;
        }
      }
      activeCueText.value = found;
    }
  }

  function setupTrackListeners() {
    const el = player.value;
    if (!el)
      return;
    el.textTracks.addEventListener("add", () => refreshSubtitleTracks());
    el.textTracks.addEventListener("remove", () => refreshSubtitleTracks());
  }

  function dispose() {
    setActiveSubTrack(null);
  }

  return {
    subtitleTracks,
    activeSubtitleId,
    subtitleMenuOpen,
    activeCueText,
    clearExternalSubtitleTracks,
    refreshSubtitleTracks,
    fetchOpenSubtitles,
    selectSubtitle,
    toggleSubtitleMenu,
    onTimeUpdate,
    setupTrackListeners,
    dispose,
  };
}
