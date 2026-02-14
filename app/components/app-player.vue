<script setup lang="ts">
import type { MediaProviderChangeEvent } from "vidstack";
import type { MediaPlayerElement } from "vidstack/elements";

import { isHLSProvider } from "vidstack";
import "vidstack/player";
import "vidstack/player/layouts";
import "vidstack/player/styles/default/layouts/video.css";
import "vidstack/player/styles/default/theme.css";
import "vidstack/player/ui";

defineProps<{
  src: string;
  title?: string;
  poster?: string;
}>();

const player = ref<MediaPlayerElement>();

function onProviderChange(event: MediaProviderChangeEvent) {
  const provider = event.detail;
  if (isHLSProvider(provider)) {
    provider.config = {};
  }
}
</script>

<template>
  <media-player
    ref="player"
    class="player"
    :src="src"
    :title="title"
    cross-origin
    plays-inline
    @provider-change="onProviderChange"
  >
    <media-provider>
      <media-poster
        v-if="poster"
        class="vds-poster"
        :src="poster"
        :alt="title"
      />
    </media-provider>
    <media-video-layout />
  </media-player>
</template>

<style scoped>
.player {
  --video-brand: #6419e6;
  --video-focus-ring-color: #6419e6;
  --video-border-radius: 8px;
}

.player[data-view-type="video"] {
  aspect-ratio: 16 / 9;
  width: 100%;
}
</style>
