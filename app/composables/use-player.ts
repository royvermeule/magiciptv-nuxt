type Media = {
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
};

export function usePlayer() {
  const currentMedia = ref<Media | null>(null);

  function setCurrentMedia(media: Media) {
    currentMedia.value = media;
  }

  function unsetCurrentMedia() {
    currentMedia.value = null;
  }

  return {
    currentMedia,
    setCurrentMedia,
    unsetCurrentMedia,
  };
}
