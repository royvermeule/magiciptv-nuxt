<script setup lang="ts">
definePageMeta({ layout: "hub" });

const { favorites, folders, createFolder, deleteFolder } = useFavorites();

const selectedFolderId = ref<number | null>(null);

const filteredFavorites = computed(() => {
  if (!favorites.value) {
    return [];
  }
  if (selectedFolderId.value === null) {
    return favorites.value;
  }
  return favorites.value.filter(f => f.folderId === selectedFolderId.value);
});

const newFolderName = ref("");
const showCreateFolder = ref(false);

async function handleCreateFolder() {
  if (!newFolderName.value.trim()) {
    return;
  }
  await createFolder(newFolderName.value.trim());
  newFolderName.value = "";
  showCreateFolder.value = false;
}

async function handleDeleteFolder(folderId: number) {
  await deleteFolder(folderId);
  if (selectedFolderId.value === folderId) {
    selectedFolderId.value = null;
  }
}
</script>

<template>
  <div>
    <div v-if="!favorites?.length" class="flex flex-col items-center justify-center py-16 opacity-60">
      <Icon name="tabler:heart" size="48" />
      <p class="mt-4 text-sm">
        No favorites yet. Tap the heart on any stream to add it here.
      </p>
    </div>

    <template v-else>
      <!-- Folder pill bar -->
      <div class="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
        <button
          class="btn btn-sm whitespace-nowrap"
          :class="selectedFolderId === null ? 'btn-primary' : 'btn-ghost'"
          @click="selectedFolderId = null"
        >
          All
        </button>
        <button
          v-for="folder in folders"
          :key="folder.id"
          class="btn btn-sm group/folder whitespace-nowrap"
          :class="selectedFolderId === folder.id ? 'btn-primary' : 'btn-ghost'"
          @click="selectedFolderId = folder.id"
        >
          {{ folder.name }}
          <span
            class="ml-1 opacity-0 transition-opacity group-hover/folder:opacity-60"
            @click.stop="handleDeleteFolder(folder.id)"
          >
            <Icon name="tabler:x" size="14" />
          </span>
        </button>
        <button
          class="btn btn-circle btn-ghost btn-sm"
          @click="showCreateFolder = true"
        >
          <Icon name="tabler:plus" size="16" />
        </button>
      </div>

      <!-- Stream grid -->
      <div v-if="filteredFavorites.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <StreamCard
          v-for="fav in filteredFavorites"
          :key="fav.id"
          :stream-id="fav.streamId"
          :name="fav.tvgName"
          :icon="fav.streamIcon ?? undefined"
          :type="fav.type"
        />
      </div>
      <div v-else class="flex flex-col items-center justify-center py-16 opacity-60">
        <Icon name="tabler:folder" size="48" />
        <p class="mt-4 text-sm">
          No favorites in this folder yet.
        </p>
      </div>
    </template>

    <!-- Create folder modal -->
    <dialog class="modal" :class="{ 'modal-open': showCreateFolder }">
      <div class="modal-box">
        <h3 class="text-lg font-bold">
          Create Folder
        </h3>
        <div class="py-4">
          <input
            v-model="newFolderName"
            type="text"
            placeholder="Folder name"
            class="input input-bordered w-full"
            @keydown.enter="handleCreateFolder"
          >
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="showCreateFolder = false; newFolderName = ''">
            Cancel
          </button>
          <button class="btn btn-primary" :disabled="!newFolderName.trim()" @click="handleCreateFolder">
            Create
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showCreateFolder = false">
        <button>close</button>
      </form>
    </dialog>
  </div>
</template>
