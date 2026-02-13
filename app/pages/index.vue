<script setup lang="ts">
import type { ProfileEditData, ProfileFormData } from "~~/shared/types/profile.types";

import type ProfileCreateModel from "~/components/profile-create-model.vue";
import type ProfileDeleteModel from "~/components/profile-delete-model.vue";
import type ProfileEditModel from "~/components/profile-edit-model.vue";

import ProfileCard from "~/components/profile-card.vue";

const deleteModal = ref<InstanceType<typeof ProfileDeleteModel> | null>(null);

const { profiles, fetchProfiles, createProfile, deleteProfile, updateProfile } = useProfiles();
const toast = useToast();
await fetchProfiles();

const createModal = ref<InstanceType<typeof ProfileCreateModel> | null>(null);
const editModal = ref<InstanceType<typeof ProfileEditModel> | null>(null);

async function handleAddProfile(data: ProfileFormData) {
  try {
    await createProfile(data.name, data.xtreamUsername, data.xtreamPassword, data.xtreamUrl, data.pin);
    createModal.value?.close();
    toast.show("Profile created");
  }
  catch (e: unknown) {
    if (e && typeof e === "object" && "statusMessage" in e) {
      createModal.value?.setError((e as { statusMessage: string }).statusMessage);
    }
    else {
      createModal.value?.setError("Failed to create profile");
    }
  }
}

function editProfile(id: number) {
  const profile = profiles.value.find(p => p.id === id);
  if (profile) {
    editModal.value?.open(profile);
  }
}

async function handleEditProfile(data: ProfileEditData) {
  try {
    await updateProfile(data.id, data.name, data.xtreamUsername, data.xtreamPassword, data.xtreamUrl, data.pin, data.newPin, data.removePin);
    editModal.value?.close();
    toast.show("Profile updated");
  }
  catch (e: unknown) {
    if (e && typeof e === "object" && "statusMessage" in e) {
      editModal.value?.setError((e as { statusMessage: string }).statusMessage);
    }
    else {
      editModal.value?.setError("Failed to update profile");
    }
  }
}

function handleDelete(id: number) {
  const profile = profiles.value.find(p => p.id === id);
  if (profile) {
    deleteModal.value?.open(profile);
  }
}

async function confirmDelete(data: { id: number; pin?: string }) {
  try {
    await deleteProfile(data.id, data.pin);
    deleteModal.value?.close();
    toast.show("Profile deleted");
  }
  catch (e: unknown) {
    if (e && typeof e === "object" && "statusMessage" in e) {
      deleteModal.value?.setError((e as { statusMessage: string }).statusMessage);
    }
    else {
      deleteModal.value?.setError("Failed to delete profile");
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
      <button class="btn btn-primary btn-sm" @click="createModal?.open()">
        <Icon name="tabler:plus" class="size-5" />
        Add Profile
      </button>
    </div>

    <div v-if="profiles.length" class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <ProfileCard v-for="profile in profiles" :key="profile.id" :profile="profile" @edit="editProfile" @delete="handleDelete" />
    </div>

    <div v-else class="mt-8 text-center text-base-content/70">
      <p>No profiles yet. Create your first one!</p>
    </div>

    <ProfileCreateModel
      ref="createModal"
      @submit="handleAddProfile"
    />
    <ProfileDeleteModel
      ref="deleteModal"
      @confirm="confirmDelete"
    />
    <ProfileEditModel
      ref="editModal"
      @submit="handleEditProfile"
    />
  </div>
</template>
