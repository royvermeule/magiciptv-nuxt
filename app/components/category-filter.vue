<script setup lang="ts">
type Category = {
  category_id: string;
  category_name: string;
};

const props = defineProps<{
  categories: Category[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [categoryId: string];
}>();

const search = defineModel<string>("search", { default: "" });
const scrollContainer = ref<HTMLElement | null>(null);

function selectCategory(id: string) {
  emit("select", id);
  nextTick(() => {
    const btn = scrollContainer.value?.querySelector(`[data-cat-id="${id}"]`) as HTMLElement | null;
    btn?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  });
}

const filteredCategories = computed(() => {
  if (!search.value)
    return props.categories;
  const term = search.value.toLowerCase();
  return props.categories.filter(cat =>
    cat.category_name.toLowerCase().includes(term),
  );
});
</script>

<template>
  <div class="space-y-3">
    <label class="input w-full">
      <Icon name="tabler:search" class="size-4 opacity-50" />
      <input v-model="search" type="text" placeholder="Search categories..." class="grow">
    </label>

    <div ref="scrollContainer" class="flex gap-2 overflow-x-auto pb-2">
      <button
        v-for="cat in filteredCategories"
        :key="cat.category_id"
        :data-cat-id="cat.category_id"
        class="btn btn-sm whitespace-nowrap"
        :class="selectedId === cat.category_id ? 'btn-primary' : 'btn-ghost'"
        @click="selectCategory(cat.category_id)"
      >
        {{ cat.category_name }}
      </button>
    </div>
  </div>
</template>
