export default defineEventHandler(async (event) => {
  const { xtreamUrl } = await getXtreamCredentials(event);
  const username = getRouterParam(event, "username");
  const password = getRouterParam(event, "password");
  const filename = getRouterParam(event, "filename");

  if (!username || !password || !filename) {
    throw createError({ statusCode: 400, statusMessage: "Missing path parameters" });
  }

  const target = `${xtreamUrl}/live/${username}/${password}/${filename}`;

  return proxyRequest(event, target, {
    fetchOptions: { redirect: "follow" },
  });
});
