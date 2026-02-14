type Favorite = {
  id: number;
  profileId: number;
  streamId: number;
  tvgName: string;
  type: "live" | "movie" | "series";
  streamIcon: string | null;
  folderId: number | null;
};

type FavoriteFolder = {
  id: number;
  profileId: number;
  name: string;
};

export function useFavorites() {
  const { data: favorites, refresh } = useFetch<Favorite[]>("/api/favorites");
  const { data: folders, refresh: refreshFolders } = useFetch<FavoriteFolder[]>("/api/favorites/folders");

  function isFavorited(streamId: number, type: string) {
    return favorites.value?.some(f => f.streamId === streamId && f.type === type) ?? false;
  }

  async function toggleFavorite(streamId: number, tvgName: string, type: string, streamIcon?: string) {
    const existing = favorites.value?.find(f => f.streamId === streamId && f.type === type);

    if (existing) {
      await $fetch(`/api/favorites/${existing.id}`, { method: "DELETE" });
    }
    else {
      await $fetch("/api/favorites", {
        method: "POST",
        body: { streamId, tvgName, streamIcon, type },
      });
    }

    await refresh();
  }

  async function createFolder(name: string) {
    await $fetch("/api/favorites/folders", {
      method: "POST",
      body: { name },
    });
    await refreshFolders();
  }

  async function deleteFolder(folderId: number) {
    await $fetch(`/api/favorites/folders/${folderId}`, { method: "DELETE" });
    await Promise.all([refreshFolders(), refresh()]);
  }

  async function moveToFolder(favoriteId: number, folderId: number | null) {
    await $fetch(`/api/favorites/${favoriteId}`, {
      method: "PATCH",
      body: { folderId },
    });
    await refresh();
  }

  async function addToFolder(streamId: number, tvgName: string, type: string, folderId: number, streamIcon?: string) {
    const existing = favorites.value?.find(f => f.streamId === streamId && f.type === type);

    if (existing) {
      await $fetch(`/api/favorites/${existing.id}`, {
        method: "PATCH",
        body: { folderId },
      });
    }
    else {
      const created = await $fetch<Favorite>("/api/favorites", {
        method: "POST",
        body: { streamId, tvgName, streamIcon, type },
      });
      await $fetch(`/api/favorites/${created.id}`, {
        method: "PATCH",
        body: { folderId },
      });
    }

    await refresh();
  }

  function getFavoriteFolderId(streamId: number, type: string) {
    return favorites.value?.find(f => f.streamId === streamId && f.type === type)?.folderId ?? null;
  }

  return { favorites, folders, isFavorited, toggleFavorite, createFolder, deleteFolder, moveToFolder, addToFolder, getFavoriteFolderId };
}
