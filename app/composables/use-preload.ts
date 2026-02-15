const preloaded = new Set<string>();

export function usePreload() {
  function preload(url: string) {
    if (preloaded.has(url)) {
      return;
    }
    preloaded.add(url);
    $fetch(url).catch(() => {
      preloaded.delete(url);
    });
  }

  return { preload };
}
