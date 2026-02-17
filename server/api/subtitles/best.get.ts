const cache = new Map<string, { data: unknown; expires: number }>();

export default defineEventHandler(async (event) => {
  await getProfileId(event);

  const { query, type, seasonNumber, episodeNumber, languages, duration } = getQuery<{
    query: string;
    type?: string;
    seasonNumber?: string;
    episodeNumber?: string;
    languages?: string;
    duration?: string | number;
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
  // round duration to nearest 10s for cache key stability
  const durNum = typeof duration === "string" ? Number(duration) : (duration as number | undefined) ?? 0;
  const durKey = durNum > 0 ? String(Math.round(durNum / 10) * 10) : "nodur";
  const cacheKey = `subs-best-${cleaned}-${type}-${seasonNumber}-${episodeNumber}-${langs}-${durKey}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now())
    return cached.data;

  // perform OpenSubtitles search (reuse same query params as search.get)
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

  const response = await $fetch<{
    data: {
      id: string;
      attributes: {
        language: string;
        subtitle_id: string;
        files: { file_id: number; file_name: string }[];
        download_count?: number;
        release?: string;
      };
    }[];
  }>("https://api.opensubtitles.com/api/v1/subtitles", {
    params,
    headers: {
      "Api-Key": apiKey,
      "User-Agent": "MagicIPTV v1.0",
    },
  }).catch(() => null);

  if (!response?.data || response.data.length === 0) {
    const result = { best: null, candidates: [] };
    cache.set(cacheKey, { data: result, expires: Date.now() + 1000 * 60 * 60 * 6 });
    return result;
  }

  // Expand into file-level candidates (limit total)
  const flat: Array<{ fileId: number; language: string; label: string; release?: string; downloads?: number; fileName?: string }> = [];
  const MAX_FILES = 8;
  for (const item of response.data) {
    const lang = item.attributes.language || "";
    const files = item.attributes.files || [];
    for (const file of files) {
      if (!file || !file.file_id)
        continue;
      flat.push({
        fileId: file.file_id,
        language: lang,
        label: `${lang.toUpperCase()} — ${file.file_name}`,
        release: (item.attributes as any).release,
        downloads: (item.attributes as any).download_count,
        fileName: file.file_name,
      });
      if (flat.length >= MAX_FILES)
        break;
    }
    if (flat.length >= MAX_FILES)
      break;
  }

  // Probe top candidates by asking our own /api/subtitles/info (it is cached)
  const probe = flat.slice(0, 6);
  const infos = await Promise.all(probe.map(p => $fetch<{ fileId: number; cues: number; firstCueStart: number; lastCueEnd: number }>(
    "/api/subtitles/info",
    { query: { fileId: p.fileId } },
  ).catch(() => null)));

  const durationSec = durNum || 0;
  const scored: Array<any> = [];
  for (let i = 0; i < probe.length; i++) {
    const meta = probe[i]!;
    const info = infos[i];
    let coverage = 0;
    let cueDensity = 0;
    let first = 0;
    let last = 0;
    let cues = 0;
    if (info) {
      first = info.firstCueStart || 0;
      last = info.lastCueEnd || 0;
      cues = info.cues || 0;
      cueDensity = Math.min(cues / 1000, 1);
      if (durationSec > 0) {
        const overlap = Math.max(0, Math.min(last, durationSec) - Math.max(first, 0));
        coverage = durationSec > 0 ? overlap / durationSec : 0;
      }
    }

    const downloads = meta.downloads || 0;
    const downloadsBonus = Math.min(Math.log2(downloads + 1) / 10, 1) * 4; // small boost

    let score = coverage * 100 + cueDensity * 10 + downloadsBonus;
    if (first <= 10)
      score += 5;
    if (durationSec > 0 && Math.abs(durationSec - last) <= 20)
      score += 5;

    scored.push({
      ...meta,
      fileName: meta.fileName,
      info,
      cues,
      first,
      last,
      coverage,
      cueDensity,
      downloads,
      score,
    });
  }

  // If we had no probed info, fall back to first file returned by API
  if (scored.length === 0 && flat.length > 0) {
    const fallback = flat[0]!;
    const result = { best: { fileId: fallback.fileId, language: fallback.language, label: fallback.label, score: 0, coverage: 0 }, candidates: flat };
    cache.set(cacheKey, { data: result, expires: Date.now() + 1000 * 60 * 60 * 6 });
    return result;
  }

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1] ?? { score: 0 };
  const scoreDelta = best.score - second.score;

  // Confidence heuristics
  let confidence: "high" | "medium" | "low" = "low";
  if ((best.coverage >= 0.9 && scoreDelta >= 8) || (best.coverage >= 0.95)) {
    confidence = "high";
  }
  else if ((best.coverage >= 0.8 && scoreDelta >= 6) || (best.coverage >= 0.85 && scoreDelta >= 4)) {
    confidence = "medium";
  }

  const numericConfidence = Math.max(0, Math.min(1, (scoreDelta / 30) * 0.7 + best.coverage * 0.3));

  const candidatesOut = scored.map(s => ({ fileId: s.fileId, language: s.language, label: s.label, score: s.score, coverage: s.coverage, cues: s.cues, first: s.first, last: s.last, downloads: s.downloads, release: s.release }));

  const out = {
    best: candidatesOut[0] ?? null,
    candidates: candidatesOut,
    confidence,
    confidenceScore: Math.round(numericConfidence * 100) / 100,
  };

  // cache for 6 hours
  cache.set(cacheKey, { data: out, expires: Date.now() + 1000 * 60 * 60 * 6 });
  return out;
});
