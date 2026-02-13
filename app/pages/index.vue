<script setup lang="ts">
import ProfileCard from "~/components/profile-card.vue";

const { profiles, fetchProfiles } = useProfiles();
await fetchProfiles();
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Profiles
      </h1>
      <button class="btn btn-primary btn-sm">
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
  </div>
</template>
