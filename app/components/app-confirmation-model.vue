<script setup lang="ts">
import type AppModel from "./app-model.vue";

defineProps<{
  title: string;
  message: string;
}>();

const emit = defineEmits<{
  confirm: [];
}>();

const modal = ref<InstanceType<typeof AppModel> | null>(null);

function open() {
  modal.value?.open();
}

function close() {
  modal.value?.close();
}

defineExpose({ open, close });
</script>

<template>
  <AppModel ref="modal" :title="title">
    <p class="mt-4 text-base-content/70">
      {{ message }}
    </p>
    <div class="mt-6 flex justify-end gap-2">
      <button class="btn btn-ghost" @click="close()">
        Cancel
      </button>
      <button class="btn btn-primary" @click="emit('confirm'); close()">
        Confirm
      </button>
    </div>
  </AppModel>
</template>
