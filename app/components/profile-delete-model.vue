<script setup lang="ts">
import type AppModel from "./app-model.vue";

const emit = defineEmits<{
  confirm: [data: { id: number; pin?: string }];
}>();

const modal = ref<InstanceType<typeof AppModel> | null>(null);
const profileId = ref<number | null>(null);
const profileHasPin = ref(false);
const pin = ref("");
const error = ref("");

function open(profile: { id: number; hasPin: boolean }) {
  profileId.value = profile.id;
  profileHasPin.value = profile.hasPin;
  modal.value?.open();
}

function close() {
  profileId.value = null;
  profileHasPin.value = false;
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
  emit("confirm", {
    id: profileId.value,
    ...(pin.value && { pin: pin.value }),
  });
}

defineExpose({ open, close, setError });
</script>

<template>
  <AppModel ref="modal" title="Delete Profile">
    <div class="mt-4">
      <div v-if="error" role="alert" class="alert alert-error mb-4">
        <Icon name="tabler:alert-circle" class="size-5" />
        <span>{{ error }}</span>
      </div>
      <p class="text-base-content/70">
        Are you sure you want to delete this profile? This action cannot be undone.
      </p>
      <div v-if="profileHasPin" class="mt-4">
        <label class="fieldset-label" for="delete-pin">Enter PIN to confirm</label>
        <input
          id="delete-pin"
          v-model="pin"
          type="password"
          placeholder="Enter current pin"
          class="input input-bordered w-full"
          maxlength="6"
          required
        >
      </div>
      <div class="mt-6 flex justify-end gap-2">
        <button class="btn btn-ghost" @click="close()">
          Cancel
        </button>
        <button class="btn btn-error" @click="handleConfirm()">
          Delete
        </button>
      </div>
    </div>
  </AppModel>
</template>
