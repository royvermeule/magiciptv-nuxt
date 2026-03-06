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

  // Fetch small text samples for each probed file so we can do
  // cross-candidate textual similarity checks (helps detect wrong
  // or out-of-sync subtitle files). Limit to top 4 content probes to
  // avoid extra API pressure.
  const contentProbe = probe.slice(0, 4);
  const samples = await Promise.all(contentProbe.map(async (p) => {
    try {
      const vtt = await $fetch<string>(`/api/subtitles/download?fileId=${p.fileId}`);
      return { fileId: p.fileId, vtt };
    }
    catch {
      return { fileId: p.fileId, vtt: null };
    }
  }));

  function extractCueTexts(vtt?: string | null) {
    if (!vtt)
      return [] as string[];
    // crude VTT/SRT cue text extractor: capture lines that are not timestamps
    const lines = vtt.split(/\r?\n/);
    const cueTexts: string[] = [];
    const timestampRe = /\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}\s*-->/;
    let buffer = [] as string[];
    for (const ln of lines) {
      if (timestampRe.test(ln)) {
        if (buffer.length) {
          cueTexts.push(buffer.join(" ").trim());
          buffer = [];
        }
        continue;
      }
      // skip WEBVTT header and cue-sequence numbers
      if (!ln || ln.startsWith("WEBVTT") || /^\d+$/.test(ln)) {
        continue;
      }
      buffer.push(ln.replace(/<[^>]+>/g, ""));
    }
    if (buffer.length)
      cueTexts.push(buffer.join(" ").trim());
    return cueTexts.filter(Boolean);
  }

  const tokenSets: Record<number, Set<string>> = {};
  const verifiable: Record<number, boolean> = {};
  for (const s of samples) {
    const texts = extractCueTexts(s.vtt);
    // sample up to 12 cues distributed across file
    const picks: string[] = [];
    if (texts.length <= 12) {
      picks.push(...texts);
    }
    else {
      const step = Math.max(1, Math.floor(texts.length / 12));
      for (let i = 0; i < texts.length; i += step) {
        const t = texts[i];
        if (t)
          picks.push(t);
        if (picks.length >= 12)
          break;
      }
    }
    const tokens = new Set<string>();
    for (const t of picks) {
      t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).forEach((w) => {
        if (w.length >= 3 && !/^\d+$/.test(w))
          tokens.add(w);
      });
    }
    tokenSets[s.fileId] = tokens;
    verifiable[s.fileId] = Boolean(s.vtt);
  }
  // mark remaining probed files as not verifiable (we didn't fetch their text)
  for (const p of probe) {
    if (verifiable[p.fileId] === undefined)
      verifiable[p.fileId] = false;
  }

  function jaccard(a: Set<string>, b: Set<string>) {
    if (!a || !b || a.size === 0 || b.size === 0) {
      return 0;
    }
    let inter = 0;
    for (const x of a) {
      if (b.has(x)) {
        inter++;
      }
    }
    const uni = new Set<string>([...a, ...b]).size;
    return uni === 0 ? 0 : inter / uni;
  }

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

    // similarity against other probed candidates (content consensus)
    const tokens = tokenSets[meta.fileId] ?? new Set<string>();
    const isVerifiable = Boolean(verifiable[meta.fileId]);
    let avgSim = 0;
    let simCount = 0;
    if (isVerifiable) {
      for (const other of probe) {
        if (other.fileId === meta.fileId)
          continue;
        if (!verifiable[other.fileId])
          continue; // only compare against verifiable peers
        const otherTokens = tokenSets[other.fileId] ?? new Set<string>();
        const s = jaccard(tokens, otherTokens);
        if (s > 0) {
          avgSim += s;
          simCount++;
        }
      }
      if (simCount > 0)
        avgSim = avgSim / simCount;
    }

    // boost score if candidate text is similar to peers; heavily penalize
    // true outliers (verifiable but dissimilar). Do NOT mark non-
    // verifiable files as outliers — treat them as "unverified".
    const similarityBonus = avgSim * 20;
    score += similarityBonus;
    const isOutlier = isVerifiable ? (simCount === 0 || avgSim < 0.12) : false;
    if (isOutlier)
      score -= 45;

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
      avgSim: Math.round((avgSim || 0) * 100) / 100,
      isOutlier: Boolean(isOutlier),
      verifiable: Boolean(isVerifiable),
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

  // Confidence heuristics — more permissive so the server can reliably
  // auto-select a single candidate when coverage is good.
  let confidence: "high" | "medium" | "low" = "low";
  if (best.coverage >= 0.95 || (best.coverage >= 0.8 && scoreDelta >= 4) || (best.coverage >= 0.85 && scoreDelta >= 2)) {
    confidence = "high";
  }
  else if (best.coverage >= 0.65 || scoreDelta >= 3) {
    confidence = "medium";
  }

  const numericConfidence = Math.max(0, Math.min(1, (scoreDelta / 30) * 0.7 + best.coverage * 0.3));

  const candidatesOut = scored.map(s => ({
    fileId: s.fileId,
    language: s.language,
    label: s.label,
    score: s.score,
    coverage: s.coverage,
    cues: s.cues,
    first: s.first,
    last: s.last,
    downloads: s.downloads,
    release: s.release,
    avgSim: s.avgSim ?? 0,
    isOutlier: Boolean(s.isOutlier),
    verifiable: Boolean((s as any).verifiable),
  }));

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
