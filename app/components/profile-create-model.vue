<script setup lang="ts">
import type AppModel from "./app-model.vue";

type ProfileFormData = {
  name: string;
  xtreamUsername: string;
  xtreamPassword: string;
  xtreamUrl: string;
};

const emit = defineEmits<{
  submit: [data: ProfileFormData];
}>();

const modal = ref<InstanceType<typeof AppModel> | null>(null);
const error = ref("");

const initialFormData: ProfileFormData = {
  name: "",
  xtreamUsername: "",
  xtreamPassword: "",
  xtreamUrl: "",
};

const formData = ref<ProfileFormData>({ ...initialFormData });

function handleSubmit() {
  error.value = "";
  emit("submit", { ...formData.value });
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

defineExpose({ open, close, setError });
</script>

<template>
  <AppModel ref="modal" title="Add Profile">
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
      </fieldset>
      <button type="submit" class="btn btn-primary w-full">
        Create Profile
      </button>
    </form>
  </AppModel>
</template>
