const cache = new Map<string, { data: unknown; expires: number }>();

export default defineEventHandler(async (event) => {
  const profileId = getCookie(event, "profile_id");
  const cacheKey = `series-${profileId}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);

  const streams = await $fetch(`${xtreamUrl}/player_api.php`, {
    params: {
      username: xtreamUsername,
      password: xtreamPassword,
      action: "get_series",
    },
  });

  const mapped = (streams as any[]).map(s => ({
    series_id: s.series_id,
    name: s.name,
    cover: s.cover,
    category_id: s.category_id,
  }));

  cache.set(cacheKey, { data: mapped, expires: Date.now() + 86_400_000 });

  return mapped;
});
