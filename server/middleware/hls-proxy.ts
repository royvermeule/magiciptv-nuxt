export default defineEventHandler(async (event) => {
  const path = getHeader(event, "x-forwarded-proto") ? event.node.req.url : event.node.req.url;

  // Only handle /hls/* requests
  if (!path?.startsWith("/hls/")) {
    return;
  }

  const query = getQuery<{ type?: string; id?: string; segment?: string }>(event);

  // If this is a segment request with all required params, proxy it
  if (query.type === "live" && query.id && query.segment) {
    try {
      const { xtreamUsername, xtreamPassword, xtreamUrl } = await getXtreamCredentials(event);

      const target = `${xtreamUrl}/live/${xtreamUsername}/${xtreamPassword}/${query.segment}`;

      return proxyRequest(event, target, {
        fetchOptions: { redirect: "follow" },
      });
    }
    catch (err: any) {
      throw createError({
        statusCode: err.statusCode || 500,
        statusMessage: err.statusMessage || "Failed to proxy segment",
      });
    }
  }

  // Not a valid segment request
  throw createError({ statusCode: 404, statusMessage: "Not found" });
});
