<script setup lang="ts">
defineProps<{
  currentStep: string;
  progress?: { current: number; total: number } | null;
  error?: string | null;
}>();

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-base-300">
    <div class="flex flex-col items-center gap-6 px-8 text-center">
      <template v-if="error">
        <Icon name="tabler:alert-circle" size="56" class="text-error" />
        <div>
          <h2 class="text-xl font-bold">
            Failed to Load
          </h2>
          <p class="mt-2 text-sm text-base-content/60">
            {{ error }}
          </p>
        </div>
        <button class="btn btn-primary" @click="emit('retry')">
          <Icon name="tabler:refresh" size="18" />
          Try Again
        </button>
      </template>

      <template v-else>
        <span class="loading loading-spinner loading-lg text-primary" />
        <div>
          <h2 class="text-xl font-bold">
            {{ currentStep || "Loading..." }}
          </h2>
          <p v-if="progress" class="mt-2 text-sm text-base-content/60">
            {{ progress.current }} / {{ progress.total }}
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
