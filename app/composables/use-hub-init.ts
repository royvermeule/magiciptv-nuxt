import type { Category, Stream } from "~~/shared/types/stream.types";

import type { SeriesInfo } from "./use-iptv-data";

type InitProgress = {
  current: number;
  total: number;
};

type InitState = {
  loading: boolean;
  error: string | null;
  currentStep: string;
  progress: InitProgress | null;
};

const state = reactive<InitState>({
  loading: false,
  error: null,
  currentStep: "",
  progress: null,
});

let initPromise: Promise<void> | null = null;
let prefetchController: AbortController | null = null;

export function useHubInit() {
  const cache = useIptvCache();
  const iptvData = useIptvData();

  async function loadFromCache(): Promise<void> {
    state.currentStep = "Loading from cache...";

    const [
      liveCategories,
      liveStreams,
      movieCategories,
      movieStreams,
      seriesCategories,
      seriesStreams,
    ] = await Promise.all([
      cache.get<Category[]>("live-categories"),
      cache.get<Stream[]>("live-streams"),
      cache.get<Category[]>("movie-categories"),
      cache.get<Stream[]>("movie-streams"),
      cache.get<Category[]>("series-categories"),
      cache.get<Stream[]>("series-streams"),
    ]);

    if (liveCategories && liveStreams) {
      iptvData.setLiveData(liveCategories, liveStreams);
    }
    if (movieCategories && movieStreams) {
      iptvData.setMovieData(movieCategories, movieStreams);
    }
    if (seriesCategories && seriesStreams) {
      iptvData.setSeriesData(seriesCategories, seriesStreams);
    }
  }

  async function fetchAndCache(): Promise<void> {
    // Step 1: Fetch categories in parallel
    state.currentStep = "Loading Live TV, Movies & Series...";
    state.progress = null;

    const [liveCategories, movieCategories, seriesCategories] = await Promise.all([
      $fetch<Category[]>("/api/xtream/live/categories"),
      $fetch<Category[]>("/api/xtream/movies/categories"),
      $fetch<Category[]>("/api/xtream/series/categories"),
    ]);

    // Step 2: Fetch all streams in parallel
    state.currentStep = "Loading content lists...";

    const [liveStreams, movieStreams, seriesStreams] = await Promise.all([
      $fetch<Stream[]>("/api/xtream/live/stream"),
      $fetch<Stream[]>("/api/xtream/movies/stream"),
      $fetch<Stream[]>("/api/xtream/series/stream"),
    ]);

    // Step 3: Populate global state
    iptvData.setLiveData(liveCategories, liveStreams);
    iptvData.setMovieData(movieCategories, movieStreams);
    iptvData.setSeriesData(seriesCategories, seriesStreams);

    // Step 4: Cache categories and streams
    state.currentStep = "Saving to cache...";

    await Promise.all([
      cache.set("live-categories", liveCategories),
      cache.set("live-streams", liveStreams),
      cache.set("movie-categories", movieCategories),
      cache.set("movie-streams", movieStreams),
      cache.set("series-categories", seriesCategories),
      cache.set("series-streams", seriesStreams),
    ]);

    await cache.markCacheValid();
  }

  // Silently prefetch all series info in the background after hub is shown.
  // Uses N concurrent workers so results trickle in without blocking the UI.
  // Already-cached entries are skipped, so this is cheap on repeat visits.
  function startBackgroundPrefetch(concurrency = 10): void {
    prefetchController?.abort();
    prefetchController = new AbortController();
    const { signal } = prefetchController;

    const seriesIds = iptvData.seriesStreams.value.map(s => String(s.series_id ?? s.stream_id));
    if (!seriesIds.length)
      return;

    let index = 0;

    async function worker() {
      while (index < seriesIds.length && !signal.aborted) {
        const seriesId = seriesIds[index++];
        if (!seriesId)
          continue;

        if (iptvData.getSeriesInfo(seriesId))
          continue;

        const cached = await cache.get<SeriesInfo>(`series-info-${seriesId}`);
        if (signal.aborted)
          return;
        if (cached) {
          iptvData.setSeriesInfo(seriesId, cached);
          continue;
        }

        const info = await $fetch<SeriesInfo>("/api/xtream/series/info", {
          query: { seriesId },
          signal,
        }).catch(() => null);
        if (signal.aborted)
          return;
        if (info) {
          iptvData.setSeriesInfo(seriesId, info);
          await cache.set(`series-info-${seriesId}`, info);
        }
      }
    }

    // Fire and forget — N workers pull from the same ID queue
    void Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  async function _initialize(): Promise<void> {
    state.loading = true;
    state.error = null;

    try {
      // Clean up expired entries first
      await cache.clearExpired();

      // Check if cache is still valid
      const isValid = await cache.isCacheValid();

      if (isValid) {
        await loadFromCache();
      }
      else {
        await fetchAndCache();
      }
    }
    catch (e) {
      state.error = e instanceof Error ? e.message : "Failed to load content. Please try again.";
      throw e;
    }
    finally {
      state.loading = false;
      state.currentStep = "";
      state.progress = null;
    }
  }

  async function initialize(): Promise<void> {
    // Deduplicate concurrent calls (e.g. layout mounts twice in dev)
    if (!initPromise) {
      initPromise = _initialize().finally(() => {
        initPromise = null;
      });
    }
    return initPromise;
  }

  async function reinitialize(): Promise<void> {
    prefetchController?.abort();
    prefetchController = null;
    initPromise = null;
    await initialize();
  }

  function stopBackgroundPrefetch(): void {
    prefetchController?.abort();
    prefetchController = null;
  }

  return {
    state: readonly(state),
    initialize,
    reinitialize,
    startBackgroundPrefetch,
    stopBackgroundPrefetch,
  };
}
