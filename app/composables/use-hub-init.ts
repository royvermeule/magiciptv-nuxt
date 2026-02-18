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

export function useHubInit() {
  const cache = useIptvCache();
  const iptvData = useIptvData();

  async function loadFromCache(): Promise<void> {
    state.currentStep = "Loading from cache...";

    // All data is loaded with a minimal set of IndexedDB reads.
    // Series info is stored as one combined entry to avoid 1000+ individual reads.
    const [
      liveCategories,
      liveStreams,
      movieCategories,
      movieStreams,
      seriesCategories,
      seriesStreams,
      seriesInfoAll,
    ] = await Promise.all([
      cache.get<Category[]>("live-categories"),
      cache.get<Stream[]>("live-streams"),
      cache.get<Category[]>("movie-categories"),
      cache.get<Stream[]>("movie-streams"),
      cache.get<Category[]>("series-categories"),
      cache.get<Stream[]>("series-streams"),
      cache.get<Record<string, SeriesInfo>>("series-info-all"),
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
    if (seriesInfoAll) {
      // Single assignment — one Vue reactive update instead of 1000+
      iptvData.setAllSeriesInfo(seriesInfoAll);
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

    // Step 3: Batch-fetch ALL series info (100 concurrent)
    state.currentStep = "Loading series details...";

    const seriesIds = seriesStreams.map(s => String(s.series_id ?? s.stream_id));

    const seriesInfoResults = await batchFetch<string, SeriesInfo>({
      items: seriesIds,
      batchSize: 100,
      fetcher: async (seriesId) => {
        return $fetch<SeriesInfo>("/api/xtream/series/info", {
          query: { seriesId },
        });
      },
      onProgress: (current, total) => {
        state.progress = { current, total };
        state.currentStep = `Loading series details... ${current}/${total}`;
      },
      onError: (seriesId, error) => {
        console.warn(`[hub-init] Failed to fetch series info for ${seriesId}:`, error);
      },
    });

    // Build a plain object map from the results
    const seriesInfoAll: Record<string, SeriesInfo> = {};
    seriesInfoResults.forEach((info, seriesId) => {
      seriesInfoAll[seriesId] = info;
    });

    // Step 4: Populate global state (single reactive update per type)
    iptvData.setLiveData(liveCategories, liveStreams);
    iptvData.setMovieData(movieCategories, movieStreams);
    iptvData.setSeriesData(seriesCategories, seriesStreams);
    iptvData.setAllSeriesInfo(seriesInfoAll);

    // Step 5: Cache everything — series info as ONE entry, not 1000+
    state.currentStep = "Saving to cache...";
    state.progress = null;

    await Promise.all([
      cache.set("live-categories", liveCategories),
      cache.set("live-streams", liveStreams),
      cache.set("movie-categories", movieCategories),
      cache.set("movie-streams", movieStreams),
      cache.set("series-categories", seriesCategories),
      cache.set("series-streams", seriesStreams),
      cache.set("series-info-all", seriesInfoAll),
    ]);

    await cache.markCacheValid();
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
    initPromise = null;
    await initialize();
  }

  return {
    state: readonly(state),
    initialize,
    reinitialize,
  };
}
