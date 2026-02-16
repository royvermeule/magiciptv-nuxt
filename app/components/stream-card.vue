<script setup lang="ts">
const props = defineProps<{
  streamId: number;
  name: string;
  icon?: string;
  type: "live" | "movie" | "series";
  fallbackIcon?: string;
}>();

const { favorites, isFavorited, toggleFavorite, folders, addToFolder, getFavoriteFolderId, moveToFolder } = useFavorites();

const hasFolder = computed(() => getFavoriteFolderId(props.streamId, props.type) !== null);

function closeDropdown() {
  (document.activeElement as HTMLElement)?.blur();
}

const linkTo = computed(() => {
  if (props.type === "series") {
    return { path: `/hub/series/${props.streamId}`, query: { name: props.name, icon: props.icon } };
  }
  return { path: "/hub/watch", query: { type: props.type, id: props.streamId, name: props.name, icon: props.icon } };
});

// ...existing code...
// (pointerdown prefetch/play-intent removed — restore simple navigation)

// Called on click to request fullscreen (runs immediately before the
// client-side navigation triggered by NuxtLink). Kept separate from
// pointerdown to avoid cancelling navigation in some browsers.
function handleClick_RequestFullscreen(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  if (linkTo.value?.path === "/hub/watch") {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

async function handleFolderClick(folderId: number) {
  const currentFolderId = getFavoriteFolderId(props.streamId, props.type);

  if (currentFolderId === folderId) {
    const fav = favorites.value?.find(f => f.streamId === props.streamId && f.type === props.type);
    if (fav) {
      await moveToFolder(fav.id, null);
    }
  }
  else {
    await addToFolder(props.streamId, props.name, props.type, folderId, props.icon);
  }

  closeDropdown();
}
</script>

<template>
  <NuxtLink
    :to="linkTo"
    class="group card bg-base-100 cursor-pointer overflow-visible shadow-sm transition-shadow hover:shadow-md"
    @click="handleClick_RequestFullscreen"
  >
    <figure class="bg-base-200 relative overflow-visible px-4 pt-4">
      <img
        v-if="icon"
        :src="icon"
        :alt="name"
        class="h-16 w-16 rounded object-contain"
      >
      <Icon v-else :name="fallbackIcon ?? 'tabler:photo'" size="40" class="text-base-content/30" />

      <!-- Favorite heart button -->
      <button
        class="absolute right-2 top-2 btn btn-circle btn-ghost btn-xs transition-opacity"
        :class="isFavorited(streamId, type) ? 'opacity-100' : 'opacity-40 lg:opacity-0 lg:group-hover:opacity-100'"
        @click.stop.prevent="toggleFavorite(streamId, name, type, icon)"
      >
        <Icon
          :name="isFavorited(streamId, type) ? 'tabler:heart-filled' : 'tabler:heart'"
          size="20"
          :class="isFavorited(streamId, type) ? 'text-red-500' : 'opacity-40'"
        />
      </button>

      <!-- Add to folder dropdown -->
      <div class="dropdown absolute left-2 top-2" @click.stop.prevent>
        <div
          tabindex="0"
          role="button"
          class="btn btn-circle btn-ghost btn-xs transition-opacity"
          :class="hasFolder ? 'opacity-100' : 'opacity-40 lg:opacity-0 lg:group-hover:opacity-100'"
        >
          <Icon
            :name="hasFolder ? 'tabler:folder-filled' : 'tabler:folder-plus'"
            size="20"
            :class="hasFolder ? 'text-primary' : 'opacity-40'"
          />
        </div>
        <ul tabindex="0" class="dropdown-content menu z-10 mt-1 w-44 rounded-box bg-base-200 p-2 shadow-lg">
          <li v-for="folder in folders" :key="folder.id">
            <button
              class="text-xs"
              :class="getFavoriteFolderId(streamId, type) === folder.id ? 'text-error' : ''"
              @click.stop.prevent="handleFolderClick(folder.id)"
            >
              <Icon :name="getFavoriteFolderId(streamId, type) === folder.id ? 'tabler:folder-minus' : 'tabler:folder'" size="16" />
              {{ getFavoriteFolderId(streamId, type) === folder.id ? `Remove from ${folder.name}` : folder.name }}
            </button>
          </li>
          <li v-if="!folders?.length">
            <span class="text-xs opacity-60">No folders yet</span>
          </li>
        </ul>
      </div>
    </figure>
    <div class="card-body p-3">
      <p class="text-center text-xs">
        {{ name }}
      </p>
    </div>
  </NuxtLink>
</template>
