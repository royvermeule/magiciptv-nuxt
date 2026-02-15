export function usePagination<T>(items: Ref<T[]> | ComputedRef<T[]>, perPage = 30) {
  const page = ref(1);

  const totalPages = computed(() => Math.ceil(items.value.length / perPage));

  const paginatedItems = computed(() => items.value.slice(0, page.value * perPage));

  const hasMore = computed(() => page.value < totalPages.value);

  function loadMore() {
    if (hasMore.value) {
      page.value++;
    }
  }

  function resetPage() {
    page.value = 1;
  }

  return { paginatedItems, hasMore, loadMore, resetPage, page, totalPages };
}
