<script setup lang="ts">
import type AppModel from "./app-model.vue";

const emit = defineEmits<{
  confirm: [data: { id: number; pin: string }];
}>();

const modal = ref<InstanceType<typeof AppModel> | null>(null);
const profileId = ref<number | null>(null);
const pin = ref("");
const error = ref("");

function open(id: number) {
  profileId.value = id;
  modal.value?.open();
}

function close() {
  profileId.value = null;
  pin.value = "";
  error.value = "";
  modal.value?.close();
}

function setError(message: string) {
  error.value = message;
}

function handleConfirm() {
  if (!profileId.value)
    return;
  emit("confirm", { id: profileId.value, pin: pin.value });
}

defineExpose({ open, close, setError });
</script>

<template>
  <AppModel ref="modal" title="Enter PIN">
    <form class="mt-4" @submit.prevent="handleConfirm">
      <div v-if="error" role="alert" class="alert alert-error mb-4">
        <Icon name="tabler:alert-circle" class="size-5" />
        <span>{{ error }}</span>
      </div>
      <label class="fieldset-label" for="select-pin">PIN</label>
      <input
        id="select-pin"
        v-model="pin"
        type="password"
        placeholder="Enter your pin"
        class="input input-bordered w-full"
        maxlength="6"
        required
      >
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn btn-ghost" @click="close()">
          Cancel
        </button>
        <button type="submit" class="btn btn-primary">
          Confirm
        </button>
      </div>
    </form>
  </AppModel>
</template>
