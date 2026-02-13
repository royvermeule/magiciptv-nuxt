<script setup lang="ts">
defineProps<{ title: string }>();
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
    <div class="modal-box">
      <h3 class="text-lg font-bold">
        {{ title }}
      </h3>
      <slot />
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
