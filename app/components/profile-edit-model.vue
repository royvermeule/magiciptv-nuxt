<script setup lang="ts">
import type AppModel from "./app-model.vue";

type ProfileEditData = {
  id: number;
  name: string;
  xtreamUsername?: string;
  xtreamPassword?: string;
  xtreamUrl?: string;
};

const emit = defineEmits<{
  submit: [data: ProfileEditData];
}>();

const modal = ref<InstanceType<typeof AppModel> | null>(null);
const error = ref("");
const profileId = ref<number | null>(null);
const formData = ref({ name: "", xtreamUsername: "", xtreamPassword: "", xtreamUrl: "" });

function close() {
  formData.value = { name: "", xtreamUsername: "", xtreamPassword: "", xtreamUrl: "" };
  error.value = "";
  profileId.value = null;
  modal.value?.close();
}

function open(profile: { id: number; name: string }) {
  profileId.value = profile.id;
  formData.value.name = profile.name;
  modal.value?.open();
}

function setError(message: string) {
  error.value = message;
}

defineExpose({ open, close, setError });

function handleSubmit() {
  if (!profileId.value)
    return;
  error.value = "";
  emit("submit", {
    id: profileId.value,
    name: formData.value.name,
    // only include xtream fields if filled in
    ...(formData.value.xtreamUsername && { xtreamUsername: formData.value.xtreamUsername }),
    ...(formData.value.xtreamPassword && { xtreamPassword: formData.value.xtreamPassword }),
    ...(formData.value.xtreamUrl && { xtreamUrl: formData.value.xtreamUrl }),
  });
}
</script>

<template>
  <AppModel ref="modal" title="Edit Profile">
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
      </fieldset>
      <button type="submit" class="btn btn-primary w-full">
        Edit Profile
      </button>
    </form>
  </AppModel>
</template>
