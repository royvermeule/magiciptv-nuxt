export default defineEventHandler(async (event) => {
  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);
  const { type, id, ext } = getQuery<{ type: string; id: string; ext?: string }>(event);

  if (!type || !id) {
    throw createError({ statusCode: 400, statusMessage: "type and id are required" });
  }

  const extension = ext || (type === "live" ? "m3u8" : "mp4");

  let streamUrl: string;

  switch (type) {
    case "live":
      streamUrl = `${xtreamUrl}/live/${xtreamUsername}/${xtreamPassword}/${id}.${extension}`;
      break;
    case "movie":
      streamUrl = `${xtreamUrl}/movie/${xtreamUsername}/${xtreamPassword}/${id}.${extension}`;
      break;
    case "series":
      streamUrl = `${xtreamUrl}/series/${xtreamUsername}/${xtreamPassword}/${id}.${extension}`;
      break;
    default:
      throw createError({ statusCode: 400, statusMessage: "Invalid type. Must be live, movie, or series" });
  }

  return { url: streamUrl };
});
