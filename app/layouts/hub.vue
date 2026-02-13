<script setup lang="ts">
import type AppConfirmationModel from "~/components/app-confirmation-model.vue";

const { logout } = useAuth();
const sidebarOpen = ref(false);

onMounted(() => {
  if (window.matchMedia("(min-width: 1024px)").matches) {
    sidebarOpen.value = true;
  }
});

const route = useRoute();

const { deselectProfile } = useProfiles();

const switchModal = ref<InstanceType<typeof AppConfirmationModel> | null>(null);

async function switchProfile() {
  await deselectProfile();
  navigateTo("/");
}

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    "hub-live": "Live TV",
    "hub-movies": "Movies",
    "hub-series": "Series",
  };
  return titles[route.name as string] ?? "MagicIPTV";
});
</script>

<template>
  <div class="drawer">
    <input v-model="sidebarOpen" type="checkbox" class="drawer-toggle">
    <div class="drawer-content flex min-h-screen flex-col">
      <nav class="navbar bg-base-100 shadow-sm">
        <div class="flex-none">
          <button class="btn btn-square btn-ghost" @click="sidebarOpen = !sidebarOpen">
            <Icon name="tabler:menu-2" size="28" />
          </button>
        </div>
        <div class="flex-1">
          <span class="text-xl font-bold">{{ pageTitle }}</span>
        </div>
        <div class="flex-none">
          <button class="btn btn-ghost btn-sm" @click="switchModal?.open()">
            <Icon name="tabler:switch-horizontal" size="18" />
            Switch Profile
          </button>
        </div>
      </nav>

      <main class="flex-1 p-4 pb-16 lg:pb-4">
        <slot />
      </main>
      <nav v-if="!sidebarOpen" class="fixed bottom-0 left-0 z-50 flex h-16 w-full bg-base-100 shadow-[0_-1px_6px_rgba(0,0,0,0.1)] lg:hidden">
        <NuxtLink to="/hub/live" class="flex flex-1 items-center justify-center opacity-60" active-class="!text-primary !opacity-100">
          <Icon name="tabler:antenna" size="24" />
        </NuxtLink>
        <NuxtLink to="/hub/movies" class="flex flex-1 items-center justify-center opacity-60" active-class="!text-primary !opacity-100">
          <Icon name="tabler:movie" size="24" />
        </NuxtLink>
        <NuxtLink to="/hub/series" class="flex flex-1 items-center justify-center opacity-60" active-class="!text-primary !opacity-100">
          <Icon name="tabler:device-tv" size="24" />
        </NuxtLink>
      </nav>
    </div>

    <div class="drawer-side">
      <div class="drawer-overlay" @click="sidebarOpen = false" />
      <aside class="menu bg-base-100 min-h-full w-64 p-4">
        <div class="mb-4 text-xl font-bold">
          MagicIPTV
        </div>

        <ul class="space-y-1">
          <li>
            <NuxtLink to="/hub/live" exact-active-class="menu-active" class="flex items-center gap-2" @click="sidebarOpen = false">
              <Icon name="tabler:antenna" class="size-5" />
              Live TV
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/hub/movies" exact-active-class="menu-active" class="flex items-center gap-2" @click="sidebarOpen = false">
              <Icon name="tabler:movie" class="size-5" />
              Movies
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/hub/series" exact-active-class="menu-active" class="flex items-center gap-2" @click="sidebarOpen = false">
              <Icon name="tabler:device-tv" class="size-5" />
              Series
            </NuxtLink>
          </li>
        </ul>

        <div class="divider" />

        <ul class="space-y-1">
          <li>
            <NuxtLink to="/hub" exact-active-class="menu-active" class="flex items-center gap-2" @click="sidebarOpen = false">
              <Icon name="tabler:heart" class="size-5" />
              Favorites
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/hub" exact-active-class="menu-active" class="flex items-center gap-2" @click="sidebarOpen = false">
              <Icon name="tabler:history" class="size-5" />
              Last Watched
            </NuxtLink>
          </li>
        </ul>

        <div class="mt-auto">
          <div class="divider" />
          <button class="btn btn-ghost btn-sm w-full justify-start gap-2" @click="logout">
            <Icon name="tabler:logout" class="size-5" />
            Logout
          </button>
        </div>
      </aside>
    </div>
    <AppConfirmationModel
      ref="switchModal"
      title="Switch Profile"
      message="Are you sure you want to switch profiles?"
      confirm-text="Switch"
      @confirm="switchProfile"
    />
  </div>
</template>
