export default defineEventHandler(async (event) => {
  const { seriesId } = getQuery<{ seriesId: string }>(event);

  if (!seriesId) {
    throw createError({ statusCode: 400, statusMessage: "seriesId is required" });
  }

  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);

  const raw = await $fetch<{ episodes: Record<string, unknown[]> }>(`${xtreamUrl}/player_api.php`, {
    params: {
      username: xtreamUsername,
      password: xtreamPassword,
      action: "get_series_info",
      series_id: String(seriesId),
    },
  });

  const episodes: Record<string, { id: string; title: string; episode_num: number; container_extension: string }[]> = {};

  for (const [season, eps] of Object.entries(raw.episodes ?? {})) {
    episodes[season] = (eps as any[]).map(ep => ({
      id: ep.id,
      title: ep.title,
      episode_num: ep.episode_num,
      container_extension: ep.container_extension,
    }));
  }

  return { episodes };
});
