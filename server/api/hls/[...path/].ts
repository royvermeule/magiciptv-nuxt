export default defineEventHandler(async (event) => {
  const query = getQuery<{ type?: string; id?: string; segment?: string }>(event);

  // If this is a segment request with all required params, proxy it to the actual proxy endpoint
  if (query.type === "live" && query.id && query.segment) {
    try {
      const result = await $fetch(`/api/xtream/proxy`, {
        query: {
          type: query.type,
          id: query.id,
          segment: query.segment,
        },
      });
      return result;
    }
    catch (err: any) {
      throw createError({
        statusCode: err.statusCode || 500,
        statusMessage: err.statusMessage || "Failed to proxy segment",
      });
    }
  }

  // Otherwise return 404
  throw createError({ statusCode: 404, statusMessage: "Not found" });
});
