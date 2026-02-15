<script setup lang="ts">
definePageMeta({ layout: "hub" });

const route = useRoute();

const type = computed(() => (route.query.type as string) as "live" | "movie" | "series");
const streamId = computed(() => route.query.id as string);
const streamName = computed(() => route.query.name as string ?? "");
const streamIcon = computed(() => route.query.icon as string | undefined);
const seriesId = computed(() => route.query.seriesId ? Number(route.query.seriesId) : undefined);
const seasonNumber = computed(() => route.query.season as string | undefined);
const episodeNumber = computed(() => route.query.episode ? Number(route.query.episode) : undefined);

const { data: stream } = await useFetch("/api/xtream/stream-url", {
  query: { type, id: streamId },
});
</script>

<template>
  <div>
    <ClientOnly>
      <AppPlayer
        v-if="stream?.url"
        :src="stream.url"
        :title="streamName"
        :poster="streamIcon"
        :type="type"
        :stream-id="Number(streamId)"
        :series-id="seriesId"
        :season-number="seasonNumber"
        :episode-number="episodeNumber"
      />
      <template #fallback>
        <div class="flex aspect-video items-center justify-center rounded-lg bg-base-200">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
