export default defineEventHandler(async (event) => {
  // This catches all /hls/* requests that HLS.js creates with its caching
  // We extract the query params and proxy to the actual segment endpoint
  const query = getQuery<{ type?: string; id?: string; segment?: string }>(event);

  // If this is a segment request with all required params, proxy it
  if (query.type === "live" && query.id && query.segment) {
    return await $fetch(`/api/xtream/proxy`, {
      query,
      headers: getHeaders(event),
    });
  }

  // Otherwise return 404
  throw createError({ statusCode: 404, statusMessage: "Not found" });
});
