<script setup lang="ts">
import type { Profile } from "~~/shared/types/profile.types";

defineProps<{
  profile: Profile;
}>();

const emit = defineEmits<{
  edit: [id: number];
  delete: [id: number];
  select: [id: number];
}>();

function closeDropdown() {
  const el = document.activeElement as HTMLElement | null;
  el?.blur();
}
</script>

<template>
  <div class="card bg-base-100 shadow cursor-pointer" @click="emit('select', profile.id)">
    <div class="card-body">
      <div class="flex items-center justify-between">
        <h2 class="card-title">
          {{ profile.name }}
          <Icon v-if="profile.hasPin" name="tabler:lock" class="size-4 text-base-content/50" />
        </h2>
        <div class="dropdown dropdown-end" @click.stop>
          <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
            <Icon name="tabler:dots-vertical" class="text-xl" />
          </div>
          <ul tabindex="0" class="dropdown-content menu z-10 w-40 rounded-box bg-base-200 p-2 shadow">
            <li>
              <button @click="emit('edit', profile.id); closeDropdown()">
                <Icon name="tabler:edit" class="size-4" />
                Edit
              </button>
            </li>
            <li>
              <button class="text-error" @click="emit('delete', profile.id); closeDropdown()">
                <Icon name="tabler:trash" class="size-4" />
                Delete
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
