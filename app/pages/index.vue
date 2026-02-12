<script setup lang="ts">
const { user } = useAuth();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">
      Welcome, {{ user?.email }}
    </h1>
    <p class="mt-2 text-base-content/70">
      This is your dashboard. More features coming soon.
    </p>
  </div>
</template>
