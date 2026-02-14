const cache = new Map<string, { data: unknown; expires: number }>();

export default defineEventHandler(async (event) => {
  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);

  const { seriesId } = getQuery<{ seriesId: string }>(event);

  if (!seriesId) {
    throw createError({ statusCode: 400, statusMessage: "seriesId is required" });
  }

  const cacheKey = `series-info-${xtreamUsername}-${seriesId}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await $fetch(`${xtreamUrl}/player_api.php`, {
    params: {
      username: xtreamUsername,
      password: xtreamPassword,
      action: "get_series_info",
      series_id: String(seriesId),
    },
  });

  cache.set(cacheKey, { data, expires: Date.now() + 600_000 });

  return data;
});
