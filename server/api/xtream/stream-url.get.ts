export default defineEventHandler((event) => {
  const { type, id, ext } = getQuery<{ type: string; id: string; ext?: string }>(event);

  if (!type || !id) {
    throw createError({ statusCode: 400, statusMessage: "type and id are required" });
  }

  const params = new URLSearchParams({ type, id });
  if (ext) {
    params.set("ext", ext);
  }

  return { url: `/api/xtream/proxy?${params.toString()}` };
});
