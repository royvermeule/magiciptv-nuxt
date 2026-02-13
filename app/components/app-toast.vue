<script setup lang="ts">
const { toasts } = useToast();
</script>

<template>
  <div class="toast toast-end toast-top z-50">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="alert"
      :class="toast.type === 'error' ? 'alert-error' : 'alert-success'"
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>
