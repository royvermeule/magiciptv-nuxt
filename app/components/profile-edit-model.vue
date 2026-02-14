<script setup lang="ts">
import type { ProfileEditData } from "~~/shared/types/profile.types";

import type AppModel from "./app-model.vue";

defineProps<{
  testing?: boolean;
  connectionStatus?: "idle" | "success" | "error";
  connectionError?: string;
}>();

const emit = defineEmits<{
  submit: [data: ProfileEditData];
  testConnection: [xtreamUsername: string, xtreamPassword: string, xtreamUrl: string];
}>();

const modal = ref<InstanceType<typeof AppModel> | null>(null);
const error = ref("");
const profileId = ref<number | null>(null);
const profileHasPin = ref(false);
const removePin = ref(false);
const formData = ref({ name: "", xtreamUsername: "", xtreamPassword: "", xtreamUrl: "", pin: "", newPin: "" });

function close() {
  formData.value = { name: "", xtreamUsername: "", xtreamPassword: "", xtreamUrl: "", pin: "", newPin: "" };
  error.value = "";
  profileId.value = null;
  profileHasPin.value = false;
  removePin.value = false;
  modal.value?.close();
}

function open(profile: { id: number; name: string; hasPin: boolean }) {
  profileId.value = profile.id;
  profileHasPin.value = profile.hasPin;
  formData.value.name = profile.name;
  modal.value?.open();
}

function setError(message: string) {
  error.value = message;
}

function handleTestConnection() {
  if (!formData.value.xtreamUsername || !formData.value.xtreamPassword || !formData.value.xtreamUrl) {
    error.value = "Fill in all xtream fields to test connection";
    return;
  }
  emit("testConnection", formData.value.xtreamUsername, formData.value.xtreamPassword, formData.value.xtreamUrl);
}

defineExpose({ open, close, setError });

function handleSubmit() {
  if (!profileId.value)
    return;
  error.value = "";
  emit("submit", {
    id: profileId.value,
    name: formData.value.name,
    ...(formData.value.xtreamUsername && { xtreamUsername: formData.value.xtreamUsername }),
    ...(formData.value.xtreamPassword && { xtreamPassword: formData.value.xtreamPassword }),
    ...(formData.value.xtreamUrl && { xtreamUrl: formData.value.xtreamUrl }),
    ...(formData.value.newPin && { newPin: formData.value.newPin }),
    ...(formData.value.pin && { pin: formData.value.pin }),
    ...(removePin.value && { removePin: true }),
  });
}
</script>

<template>
  <AppModel ref="modal" title="Edit Profile" :closable="true">
    <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
      <div v-if="error" role="alert" class="alert alert-error">
        <Icon name="tabler:alert-circle" class="size-5" />
        <span>{{ error }}</span>
      </div>
      <fieldset class="fieldset">
        <label class="fieldset-label" for="profile-name">Name</label>
        <input
          id="profile-name"
          v-model="formData.name"
          type="text"
          placeholder="e.g. Living Room"
          class="input input-bordered w-full"
          required
        >
        <label class="fieldset-label" for="xtream-username">Xtream username</label>
        <input
          id="xtream-username"
          v-model="formData.xtreamUsername"
          type="text"
          placeholder="The username from your IPTV provider"
          class="input input-bordered w-full"
        >

        <label class="fieldset-label" for="xtream-password">Xtream password</label>
        <input
          id="xtream-password"
          v-model="formData.xtreamPassword"
          type="text"
          placeholder="The password from your IPTV provider"
          class="input input-bordered w-full"
        >

        <label class="fieldset-label" for="xtream-url">Xtream url</label>
        <input
          id="xtream-url"
          v-model="formData.xtreamUrl"
          type="text"
          placeholder="The xtream url from your IPTV provider"
          class="input input-bordered w-full"
        >
        <button type="button" class="btn btn-outline btn-sm" :disabled="testing" @click="handleTestConnection">
          <span v-if="testing" class="loading loading-spinner loading-xs" />
          <Icon v-else name="tabler:plug-connected" class="size-4" />
          Test Connection
        </button>

        <div v-if="connectionStatus === 'success'" role="alert" class="alert alert-success">
          <Icon name="tabler:check" class="size-5" />
          <span>Connection successful!</span>
        </div>

        <div v-if="connectionStatus === 'error'" role="alert" class="alert alert-error">
          <Icon name="tabler:alert-circle" class="size-5" />
          <span>{{ connectionError }}</span>
        </div>
      </fieldset>

      <div class="divider">
        PIN
      </div>

      <label v-if="!removePin" class="fieldset-label" for="edit-new-pin">New PIN</label>
      <input
        v-if="!removePin"
        id="edit-new-pin"
        v-model="formData.newPin"
        type="password"
        placeholder="Set a new 4-6 digit pin"
        class="input input-bordered w-full"
        maxlength="6"
      >

      <label v-if="profileHasPin" class="label cursor-pointer gap-2">
        <span class="label-text">Remove PIN</span>
        <input v-model="removePin" type="checkbox" class="checkbox">
      </label>

      <template v-if="profileHasPin">
        <div class="divider" />

        <label class="fieldset-label" for="edit-current-pin">Current PIN</label>
        <input
          id="edit-current-pin"
          v-model="formData.pin"
          type="password"
          placeholder="Enter current pin to confirm changes"
          class="input input-bordered w-full"
          maxlength="6"
          required
        >
      </template>

      <button type="submit" class="btn btn-primary w-full">
        Edit Profile
      </button>
    </form>
  </AppModel>
</template>
