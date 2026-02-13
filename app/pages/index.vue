<script setup lang="ts">
import type AppConfirmationModel from "~/components/app-confirmation-model.vue";
import type ProfileCreateModel from "~/components/profile-create-model.vue";
import type ProfileEditModel from "~/components/profile-edit-model.vue";

import ProfileCard from "~/components/profile-card.vue";

const deleteModal = ref<InstanceType<typeof AppConfirmationModel> | null>(null);
const profileToDelete = ref<number | null>(null);

const { profiles, fetchProfiles, createProfile, deleteProfile, updateProfile } = useProfiles();
const toast = useToast();
await fetchProfiles();

const createModal = ref<InstanceType<typeof ProfileCreateModel> | null>(null);
const editModal = ref<InstanceType<typeof ProfileEditModel> | null>(null);

async function handleAddProfile(data: { name: string; xtreamUsername: string; xtreamPassword: string; xtreamUrl: string }) {
  try {
    await createProfile(data.name, data.xtreamUsername, data.xtreamPassword, data.xtreamUrl);
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

async function handleEditProfile(data: { id: number; name: string; xtreamUsername?: string; xtreamPassword?: string; xtreamUrl?: string }) {
  try {
    await updateProfile(data.id, data.name, data.xtreamUsername, data.xtreamPassword, data.xtreamUrl);
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
  profileToDelete.value = id;
  deleteModal.value?.open();
}

async function confirmDelete() {
  if (!profileToDelete.value)
    return;
  try {
    await deleteProfile(profileToDelete.value);
    toast.show("Profile deleted");
  }
  catch (e: unknown) {
    if (e && typeof e === "object" && "statusMessage" in e) {
      toast.show((e as { statusMessage: string }).statusMessage, "error");
    }
    else {
      toast.show("Failed to delete profile", "error");
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
    <AppConfirmationModel
      ref="deleteModal"
      title="Delete Profile"
      message="Are you sure you want to delete this profile? This action cannot be undone."
      @confirm="confirmDelete"
    />
    <ProfileEditModel
      ref="editModal"
      @submit="handleEditProfile"
    />
  </div>
</template>
