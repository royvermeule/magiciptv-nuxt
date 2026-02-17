const cache = new Map<string, { data: unknown; expires: number }>();

export default defineEventHandler(async (event) => {
  await getProfileId(event);

  const { query, type, seasonNumber, episodeNumber, languages } = getQuery<{
    query: string;
    type?: string;
    seasonNumber?: string;
    episodeNumber?: string;
    languages?: string;
  }>(event);

  if (!query) {
    throw createError({ statusCode: 400, statusMessage: "query is required" });
  }

  const config = useRuntimeConfig();
  const apiKey = config.openSubtitlesApiKey;
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: "OpenSubtitles API key not configured" });
  }

  const cleaned = cleanTitle(query);
  const langs = languages || "en";
  const cacheKey = `subs-${cleaned}-${type}-${seasonNumber}-${episodeNumber}-${langs}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const params: Record<string, string> = {
    query: cleaned,
    languages: langs,
  };

  if (type === "movie") {
    params.type = "movie";
  }
  else if (type === "series") {
    params.type = "episode";
    if (seasonNumber)
      params.season_number = seasonNumber;
    if (episodeNumber)
      params.episode_number = episodeNumber;
  }

  // eslint-disable-next-line no-console
  console.log("[subtitles/search] params:", params);

  const response = await $fetch<{
    data: {
      id: string;
      attributes: {
        language: string;
        subtitle_id: string;
        files: { file_id: number; file_name: string }[];
      };
    }[];
  }>("https://api.opensubtitles.com/api/v1/subtitles", {
    params,
    headers: {
      "Api-Key": apiKey,
      "User-Agent": "MagicIPTV v1.0",
    },
  }).catch((err) => {
    console.error("[subtitles/search] API error:", err?.message || err);
    return null;
  });

  // eslint-disable-next-line no-console
  console.log("[subtitles/search] results:", response?.data?.length ?? 0);

  if (!response?.data) {
    return [];
  }

  // Expand results to include multiple file variants (same language)
  // so the client can choose the best matching file. Limit total
  // results to avoid extra API downloads on the client.
  const results: { fileId: number; language: string; label: string; release?: string; downloads?: number }[] = [];
  const MAX_RESULTS = 8;

  for (const item of response.data) {
    const lang = item.attributes.language || "";
    const files = item.attributes.files || [];
    for (const file of files) {
      if (!file || !file.file_id)
        continue;
      results.push({
        fileId: file.file_id,
        language: lang,
        label: `${lang.toUpperCase()} — ${file.file_name}`,
        release: (item.attributes as any).release,
        downloads: (item.attributes as any).download_count,
      });
      if (results.length >= MAX_RESULTS)
        break;
    }
    if (results.length >= MAX_RESULTS)
      break;
  }

  cache.set(cacheKey, { data: results, expires: Date.now() + 3_600_000 });
  return results;
});
