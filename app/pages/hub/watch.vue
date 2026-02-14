<script setup lang="ts">
definePageMeta({ layout: "hub" });

const route = useRoute();

const type = computed(() => route.query.type as string);
const streamId = computed(() => route.query.id as string);
const streamName = computed(() => route.query.name as string ?? "");
const streamIcon = computed(() => route.query.icon as string | undefined);

const { data: stream } = await useFetch("/api/xtream/stream-url", {
  query: { type, id: streamId },
});
</script>

<template>
  <div>
    <div class="mb-4 flex items-center gap-3">
      <button class="btn btn-circle btn-ghost btn-sm" @click="$router.back()">
        <Icon name="tabler:arrow-left" size="20" />
      </button>
      <div class="flex items-center gap-2">
        <img
          v-if="streamIcon"
          :src="streamIcon"
          :alt="streamName"
          class="h-8 w-8 rounded object-contain"
        >
        <h2 class="text-lg font-bold">
          {{ streamName }}
        </h2>
      </div>
    </div>

    <ClientOnly>
      <AppPlayer
        v-if="stream?.url"
        :src="stream.url"
        :title="streamName"
        :poster="streamIcon"
      />
      <template #fallback>
        <div class="flex aspect-video items-center justify-center rounded-lg bg-base-200">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
