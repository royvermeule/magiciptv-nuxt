export default defineEventHandler(async (event) => {
  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);

  const streams = await $fetch(`${xtreamUrl}/player_api.php`, {
    params: {
      username: xtreamUsername,
      password: xtreamPassword,
      action: "get_series",
    },
  });

  return (streams as any[]).map(s => ({
    series_id: s.series_id,
    name: s.name,
    cover: s.cover,
    category_id: s.category_id,
  }));
});
