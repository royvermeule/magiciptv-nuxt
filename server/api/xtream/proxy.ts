export default defineEventHandler(async (event) => {
  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);
  const { type, id, ext } = getQuery<{ type: string; id: string; ext?: string }>(event);

  if (!type || !id) {
    throw createError({ statusCode: 400, statusMessage: "type and id are required" });
  }

  const extension = ext || (type === "live" ? "m3u8" : "mp4");

  let target: string;

  switch (type) {
    case "live":
      target = `${xtreamUrl}/live/${xtreamUsername}/${xtreamPassword}/${id}.${extension}`;
      break;
    case "movie":
      target = `${xtreamUrl}/movie/${xtreamUsername}/${xtreamPassword}/${id}.${extension}`;
      break;
    case "series":
      target = `${xtreamUrl}/series/${xtreamUsername}/${xtreamPassword}/${id}.${extension}`;
      break;
    default:
      throw createError({ statusCode: 400, statusMessage: "Invalid type" });
  }

  // For live streams, always proxy — HLS.js uses fetch() internally which
  // requires CORS, so the IPTV URL must be served through our origin.
  // For movies/series, the browser's native <video> element does NOT enforce
  // CORS for its src attribute. HEAD requests are proxied so Vidstack can
  // detect the Content-Type. GET requests are redirected directly to the IPTV
  // URL so the browser streams natively without proxy overhead.
  if (type === "live") {
    return proxyRequest(event, target, {
      fetchOptions: { redirect: "follow" },
    });
  }

  const method = getMethod(event).toUpperCase();
  if (method === "HEAD") {
    return proxyRequest(event, target, {
      fetchOptions: { redirect: "follow" },
    });
  }

  return sendRedirect(event, target, 302);
});
