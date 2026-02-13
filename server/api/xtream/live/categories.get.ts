export default defineEventHandler(async (event) => {
  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);

  const categories = await $fetch(`${xtreamUrl}/player_api.php`, {
    params: {
      username: xtreamUsername,
      password: xtreamPassword,
      action: "get_live_categories",
    },
  });

  return categories;
});
