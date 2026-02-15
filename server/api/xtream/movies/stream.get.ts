export default defineEventHandler(async (event) => {
  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);

  const query = getQuery(event);
  const categoryId = query.category_id;

  const streams = await $fetch(`${xtreamUrl}/player_api.php`, {
    params: {
      username: xtreamUsername,
      password: xtreamPassword,
      action: "get_vod_streams",
      ...(categoryId && { category_id: String(categoryId) }),
    },
  });

  return streams;
});
