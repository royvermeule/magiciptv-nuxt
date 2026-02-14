<script setup lang="ts">
import type { ProfileFormData } from "~~/shared/types/profile.types";

import type AppModel from "./app-model.vue";

defineProps<{
  testing?: boolean;
  connectionStatus?: "idle" | "success" | "error";
  connectionError?: string;
}>();

const emit = defineEmits<{
  submit: [data: ProfileFormData];
  testConnection: [xtreamUsername: string, xtreamPassword: string, xtreamUrl: string];
}>();

const modal = ref<InstanceType<typeof AppModel> | null>(null);
const error = ref("");

const initialFormData: ProfileFormData = {
  name: "",
  xtreamUsername: "",
  xtreamPassword: "",
  xtreamUrl: "",
  pin: "",
};

const formData = ref<ProfileFormData>({ ...initialFormData });

function handleSubmit() {
  error.value = "";
  emit("submit", {
    name: formData.value.name,
    xtreamUsername: formData.value.xtreamUsername,
    xtreamPassword: formData.value.xtreamPassword,
    xtreamUrl: formData.value.xtreamUrl,
    ...(formData.value.pin && { pin: formData.value.pin }),
  });
}

function setError(message: string) {
  error.value = message;
}

function open() {
  modal.value?.open();
}

function close() {
  formData.value = { ...initialFormData };
  error.value = "";
  modal.value?.close();
}

function handleTestConnection() {
  if (!formData.value.xtreamUsername || !formData.value.xtreamPassword || !formData.value.xtreamUrl) {
    error.value = "Fill in all xtream fields to test connection";
    return;
  }
  emit("testConnection", formData.value.xtreamUsername, formData.value.xtreamPassword, formData.value.xtreamUrl);
}

defineExpose({ open, close, setError });
</script>

<template>
  <AppModel ref="modal" title="Add Profile" :closable="true">
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
          required
        >

        <label class="fieldset-label" for="xtream-password">Xtream password</label>
        <input
          id="xtream-password"
          v-model="formData.xtreamPassword"
          type="text"
          placeholder="The password from your IPTV provider"
          class="input input-bordered w-full"
          required
        >

        <label class="fieldset-label" for="xtream-url">Xtream url</label>
        <input
          id="xtream-url"
          v-model="formData.xtreamUrl"
          type="text"
          placeholder="The xtream url from your IPTV provider"
          class="input input-bordered w-full"
          required
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

        <div class="divider">
          Optional
        </div>

        <label class="fieldset-label" for="create-pin">PIN</label>
        <input
          id="create-pin"
          v-model="formData.pin"
          type="password"
          placeholder="4-6 digit pin to protect this profile"
          class="input input-bordered w-full"
          maxlength="6"
        >
      </fieldset>
      <button type="submit" class="btn btn-primary w-full">
        Create Profile
      </button>
    </form>
  </AppModel>
</template>
