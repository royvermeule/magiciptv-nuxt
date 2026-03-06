export default defineEventHandler(async (event) => {
  const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);
  const { type, id, ext, segmentPath, segment } = getQuery<{ type: string; id: string; ext?: string; segmentPath?: string; segment?: string }>(event);

  if (!type || !id) {
    throw createError({ statusCode: 400, statusMessage: "type and id are required" });
  }

  // If segment param is provided, proxy that specific segment
  if (segment) {
    const target = `${xtreamUrl}/live/${xtreamUsername}/${xtreamPassword}/${segment}`;
    return proxyRequest(event, target, {
      fetchOptions: { redirect: "follow" },
    });
  }

  // If segmentPath is provided, proxy the segment request directly
  if (segmentPath) {
    const target = `${xtreamUrl}/${segmentPath}`;
    return proxyRequest(event, target, {
      fetchOptions: { redirect: "follow" },
    });
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
    // Proxy the manifest and rewrite segment URLs to go through our proxy
    const response = await fetch(target, {
      redirect: "follow",
    }).catch((err) => {
      throw createError({ statusCode: 500, statusMessage: err.message });
    });

    if (!response.ok) {
      throw createError({ statusCode: response.status, statusMessage: response.statusText });
    }

    const manifestText = await response.text();

    // Rewrite manifest URLs to point back to this same proxy endpoint with segment parameter
    // This avoids HLS.js's URL caching/rewriting issues
    const rewritten = (manifestText || "").replace(
      /([^/\n"']+\.ts)/g,
      (match) => {
        // Clean up the match to remove any leading slashes or paths
        const filename = match.split("/").pop() || match;
        // Point back to the same proxy endpoint with segment query param
        return `?type=live&id=${id}&segment=${filename}`;
      },
    );

    setHeader(event, "Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    return rewritten;
  }

  const method = getMethod(event).toUpperCase();
  if (method === "HEAD") {
    return proxyRequest(event, target, {
      fetchOptions: { redirect: "follow" },
    });
  }

  return sendRedirect(event, target, 302);
});
