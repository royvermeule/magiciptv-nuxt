<script setup lang="ts">
import type AppModel from "~/components/app-model.vue";

import ProfileCard from "~/components/profile-card.vue";

const { profiles, fetchProfiles, createProfile } = useProfiles();
await fetchProfiles();

const addProfileModal = ref<InstanceType<typeof AppModel> | null>(null);
const newProfileName = ref("");

const error = ref("");

async function handleAddProfile() {
  error.value = "";
  try {
    await createProfile(newProfileName.value);
    addProfileModal.value?.close();
    newProfileName.value = "";
  }
  catch (e: unknown) {
    if (e && typeof e === "object" && "statusMessage" in e) {
      error.value = (e as { statusMessage: string }).statusMessage;
    }
    else {
      error.value = "Failed to create profile";
    }
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Profiles
      </h1>
      <button class="btn btn-primary btn-sm" @click="addProfileModal?.open()">
        <Icon name="tabler:plus" class="size-5" />
        Add Profile
      </button>
    </div>

    <div v-if="profiles.length" class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ProfileCard v-for="profile in profiles" :key="profile.id" :profile="profile" />
    </div>

    <div v-else class="mt-8 text-center text-base-content/70">
      <p>No profiles yet. Create your first one!</p>
    </div>

    <AppModel ref="addProfileModal" title="Add Profile">
      <form class="mt-4 space-y-4" @submit.prevent="handleAddProfile">
        <div v-if="error" role="alert" class="alert alert-error">
          <Icon name="tabler:alert-circle" class="size-5" />
          <span>{{ error }}</span>
        </div>
        <fieldset class="fieldset">
          <label class="fieldset-label" for="profile-name">Name</label>
          <input
            id="profile-name"
            v-model="newProfileName"
            type="text"
            placeholder="e.g. Living Room"
            class="input input-bordered w-full"
            required
          >
          <label class="fieldset-label" for="xtream-username">Xtream username</label>
          <input
            id="xtream-username"
            type="text"
            placeholder="The username from your IPTV provider"
            class="input input-bordered w-full"
            required
          >

          <label class="fieldset-label" for="xtream-password">Xtream password</label>
          <input
            id="xtream-username"
            type="text"
            placeholder="The password from your IPTV provider"
            class="input input-bordered w-full"
            required
          >

          <label class="fieldset-label" for="xtream-url">Xtream url</label>
          <input
            id="xtream-username"
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
  </div>
</template>
