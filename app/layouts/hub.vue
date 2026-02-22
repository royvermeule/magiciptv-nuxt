<script setup lang="ts">
import type AppConfirmationModel from "~/components/app-confirmation-model.vue";

const { logout } = useAuth();
const sidebarOpen = ref(false);
const optionsOpen = ref(false);
const initialized = ref(false);

const { state: initState, initialize, reinitialize, startBackgroundPrefetch, stopBackgroundPrefetch } = useHubInit();
const { clearAllData } = useIptvData();
const cache = useIptvCache();

onMounted(async () => {
  if (window.matchMedia("(min-width: 1024px)").matches) {
    sidebarOpen.value = true;
  }
  await initialize();
  initialized.value = true;
  // Delay start so the user has time to navigate before background fetching begins.
  // 2 workers = low enough not to saturate the IPTV provider API.
  setTimeout(() => startBackgroundPrefetch(2), 5000);
});

const route = useRoute();

// Pause background prefetch while watching to avoid competing with stream requests.
// Resume when the user navigates away from the watch page.
let prefetchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(() => route.name, (name) => {
  if (name === "hub-watch") {
    if (prefetchTimeout !== null) {
      clearTimeout(prefetchTimeout);
      prefetchTimeout = null;
    }
    stopBackgroundPrefetch();
  }
  else if (initialized.value) {
    prefetchTimeout = setTimeout(() => startBackgroundPrefetch(2), 3000);
  }
});

const { deselectProfile } = useProfiles();

const switchModal = ref<InstanceType<typeof AppConfirmationModel> | null>(null);
const reloadModal = ref<InstanceType<typeof AppConfirmationModel> | null>(null);
const logoutModal = ref<InstanceType<typeof AppConfirmationModel> | null>(null);

async function switchProfile() {
  clearAllData();
  await cache.clearAll();
  await deselectProfile();
  navigateTo("/");
}

async function reloadData() {
  sidebarOpen.value = false;
  clearAllData();
  await cache.clearAll();
  initialized.value = false;
  await reinitialize();
  initialized.value = true;
  setTimeout(() => startBackgroundPrefetch(2), 5000);
}

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    "hub-live": "Live TV",
    "hub-movies": "Movies",
    "hub-series": "Series",
    "hub-favorites": "Favorites",
    "hub-watch": "Now Playing",
    "hub-history": "Watch History",
  };
  return titles[route.name as string] ?? "MagicIPTV";
});
</script>

<template>
  <div class="drawer">
    <!-- Full-screen loader — always rendered so it can overlay the slot -->
    <AppHubLoader
      v-if="!initialized"
      :current-step="initState.currentStep"
      :progress="initState.progress"
      :error="initState.error"
      @retry="reinitialize().then(() => { initialized.value = true; })"
    />

    <input v-model="sidebarOpen" type="checkbox" class="drawer-toggle">
    <div class="drawer-content flex min-h-screen flex-col">
      <!-- Navbar — only shown after init -->
      <nav v-if="initialized" class="navbar bg-base-100 shadow-sm">
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

      <!-- Page content — always rendered so Nuxt can detect <NuxtPage /> -->
      <main class="flex-1 p-4 pb-16 lg:pb-4">
        <slot />
      </main>

      <!-- Bottom nav — only shown after init -->
      <nav v-if="initialized && !sidebarOpen" class="fixed bottom-0 left-0 z-50 flex h-16 w-full bg-base-100 shadow-[0_-1px_6px_rgba(0,0,0,0.1)] lg:hidden">
        <NuxtLink to="/hub/live" class="flex flex-1 items-center justify-center opacity-60" active-class="!text-primary !opacity-100">
          <Icon name="tabler:antenna" size="24" />
        </NuxtLink>
        <NuxtLink to="/hub/movies" class="flex flex-1 items-center justify-center opacity-60" active-class="!text-primary !opacity-100">
          <Icon name="tabler:movie" size="24" />
        </NuxtLink>
        <NuxtLink to="/hub/series" class="flex flex-1 items-center justify-center opacity-60" active-class="!text-primary !opacity-100">
          <Icon name="tabler:device-tv" size="24" />
        </NuxtLink>
        <NuxtLink to="/hub/history" class="flex flex-1 items-center justify-center opacity-60" active-class="!text-primary !opacity-100">
          <Icon name="tabler:history" size="24" />
        </NuxtLink>
      </nav>
    </div>

    <!-- Sidebar — only shown after init -->
    <div v-if="initialized" class="drawer-side">
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
            <NuxtLink to="/hub/favorites" exact-active-class="menu-active" class="flex items-center gap-2" @click="sidebarOpen = false">
              <Icon name="tabler:heart" class="size-5" />
              Favorites
            </NuxtLink>
          </li>
          <li>
            <NuxtLink to="/hub/history" exact-active-class="menu-active" class="flex items-center gap-2" @click="sidebarOpen = false">
              <Icon name="tabler:history" class="size-5" />
              Watch History
            </NuxtLink>
          </li>
        </ul>

        <div class="mt-auto">
          <div class="divider" />

          <!-- Options toggle -->
          <button class="btn btn-ghost btn-sm w-full justify-between gap-2" @click="optionsOpen = !optionsOpen">
            <span class="flex items-center gap-2">
              <Icon name="tabler:settings" class="size-5" />
              Options
            </span>
            <Icon
              name="tabler:chevron-down"
              class="size-4 transition-transform"
              :class="optionsOpen ? 'rotate-180' : ''"
            />
          </button>

          <!-- Options items -->
          <ul v-if="optionsOpen" class="mt-1 space-y-1">
            <li>
              <button class="btn btn-ghost btn-sm w-full justify-start gap-2" @click="reloadModal?.open()">
                <Icon name="tabler:refresh" class="size-5" />
                Reload Live TV, Movies & Series
              </button>
            </li>
            <li>
              <button class="btn btn-ghost btn-sm w-full justify-start gap-2" @click="logoutModal?.open()">
                <Icon name="tabler:logout" class="size-5" />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <AppConfirmationModel
      ref="switchModal"
      title="Switch Profile"
      message="Are you sure you want to switch profiles?"
      @confirm="switchProfile"
    />
    <AppConfirmationModel
      ref="reloadModal"
      title="Reload Content"
      message="This will reload all Live TV, Movies and Series. This can take a while. Do you wish to proceed?"
      @confirm="reloadData"
    />
    <AppConfirmationModel
      ref="logoutModal"
      title="Logout"
      message="Are you sure you want to logout?"
      @confirm="logout"
    />
  </div>
</template>
