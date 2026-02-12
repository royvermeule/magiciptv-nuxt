<script setup lang="ts">
const { user, logout } = useAuth();
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <nav class="navbar bg-base-100 shadow-sm">
      <div class="flex-1">
        <NuxtLink to="/" class="btn btn-ghost text-xl">
          MagicIPTV
        </NuxtLink>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-base-content/70">{{ user?.email }}</span>
        <button class="btn btn-ghost btn-sm" @click="logout">
          <Icon name="tabler:logout" class="size-5" />
          Logout
        </button>
      </div>
    </nav>
    <main class="container mx-auto p-4">
      <slot />
    </main>
  </div>
</template>
