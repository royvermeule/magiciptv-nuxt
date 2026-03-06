import type { Category, Stream } from "~~/shared/types/stream.types";

export type SeriesInfo = {
  episodes: Record<string, { id: string; title: string; episode_num: number; container_extension: string }[]>;
};

export function useIptvData() {
  // Use markRaw on arrays to prevent Vue from deeply proxying every item.
  // We only need reactivity at the ref level (replace the whole array),
  // not at the element level — this avoids massive proxy overhead for
  // large providers with 10,000+ streams or 1,000+ series entries.
  const liveCategories = useState<Category[]>("iptv-live-categories", () => []);
  const liveStreams = useState<Stream[]>("iptv-live-streams", () => []);

  const movieCategories = useState<Category[]>("iptv-movie-categories", () => []);
  const movieStreams = useState<Stream[]>("iptv-movie-streams", () => []);

  const seriesCategories = useState<Category[]>("iptv-series-categories", () => []);
  const seriesStreams = useState<Stream[]>("iptv-series-streams", () => []);

  // Stored as a plain non-reactive object — we replace it wholesale.
  // Avoids 1000+ individual reactive property assignments on load.
  const seriesInfoMap = useState<Record<string, SeriesInfo>>("iptv-series-info-map", () => markRaw({}));

  function setLiveData(categories: Category[], streams: Stream[]): void {
    liveCategories.value = markRaw(categories);
    liveStreams.value = markRaw(streams);
  }

  function setMovieData(categories: Category[], streams: Stream[]): void {
    movieCategories.value = markRaw(categories);
    movieStreams.value = markRaw(streams);
  }

  function setSeriesData(categories: Category[], streams: Stream[]): void {
    seriesCategories.value = markRaw(categories);
    seriesStreams.value = markRaw(streams);
  }

  function setAllSeriesInfo(map: Record<string, SeriesInfo>): void {
    seriesInfoMap.value = markRaw(map);
  }

  function setSeriesInfo(id: string, info: SeriesInfo): void {
    seriesInfoMap.value = markRaw({ ...seriesInfoMap.value, [id]: info });
  }

  function getSeriesInfo(seriesId: string): SeriesInfo | undefined {
    return seriesInfoMap.value[seriesId];
  }

  function clearAllData(): void {
    liveCategories.value = markRaw([]);
    liveStreams.value = markRaw([]);
    movieCategories.value = markRaw([]);
    movieStreams.value = markRaw([]);
    seriesCategories.value = markRaw([]);
    seriesStreams.value = markRaw([]);
    seriesInfoMap.value = markRaw({});
  }

  return {
    liveCategories,
    liveStreams,
    movieCategories,
    movieStreams,
    seriesCategories,
    seriesStreams,
    seriesInfoMap,
    setLiveData,
    setMovieData,
    setSeriesData,
    setAllSeriesInfo,
    setSeriesInfo,
    getSeriesInfo,
    clearAllData,
  };
}
