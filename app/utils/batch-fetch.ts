type BatchFetchOptions<TItem, TResult> = {
  items: TItem[];
  batchSize: number;
  fetcher: (item: TItem) => Promise<TResult>;
  onProgress?: (completed: number, total: number) => void;
  onError?: (item: TItem, error: unknown) => void;
};

export async function batchFetch<TItem, TResult>({
  items,
  batchSize,
  fetcher,
  onProgress,
  onError,
}: BatchFetchOptions<TItem, TResult>): Promise<Map<TItem, TResult>> {
  const results = new Map<TItem, TResult>();
  let completed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(batch.map(item => fetcher(item)));

    batchResults.forEach((result, index) => {
      const item = batch[index]!;
      completed++;

      if (result.status === "fulfilled") {
        results.set(item, result.value);
      }
      else {
        onError?.(item, result.reason);
      }

      onProgress?.(completed, items.length);
    });
  }

  return results;
}
