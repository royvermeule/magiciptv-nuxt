<script setup lang="ts">
defineProps<{ title?: string; closable?: boolean }>();
const dialog = ref<HTMLDialogElement | null>(null);

function open() {
  dialog.value?.showModal();
}

function close() {
  dialog.value?.close();
}

defineExpose({ open, close });
</script>

<template>
  <dialog ref="dialog" class="modal">
    <div class="modal-box flex max-h-[80vh] flex-col overflow-hidden">
      <div v-if="title || closable" class="flex shrink-0 items-center justify-between pb-3">
        <h3 v-if="title" class="text-lg font-bold">
          {{ title }}
        </h3>
        <button v-if="closable" class="btn btn-circle btn-ghost btn-sm" @click="close">
          <Icon name="tabler:x" size="18" />
        </button>
      </div>
      <div class="modal-scroll -mr-4 flex-1 overflow-y-auto pr-4">
        <slot />
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<style scoped>
.modal-scroll {
  scrollbar-width: thin;
  scrollbar-color: oklch(var(--bc) / 0.2) transparent;
}
</style>

<style>
.modal-scroll::-webkit-scrollbar {
  width: 6px !important;
}

.modal-scroll::-webkit-scrollbar-track {
  background: transparent !important;
}

.modal-scroll::-webkit-scrollbar-thumb {
  background: oklch(var(--bc) / 0.2) !important;
  border-radius: 3px !important;
}

.modal-scroll::-webkit-scrollbar-button {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}
</style>
