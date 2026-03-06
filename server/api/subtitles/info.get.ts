const cache = new Map<string, { data: unknown; expires: number }>();

export default defineEventHandler(async (event) => {
  await getProfileId(event);

  const { fileId } = getQuery<{ fileId: string }>(event);
  if (!fileId) {
    throw createError({ statusCode: 400, statusMessage: "fileId is required" });
  }

  const key = `sub-info-${fileId}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now())
    return cached.data;

  const config = useRuntimeConfig();
  const apiKey = config.openSubtitlesApiKey;
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: "OpenSubtitles API key not configured" });
  }

  // Request a download link from OpenSubtitles
  const dlResponse = await $fetch<{ link: string }>(
    "https://api.opensubtitles.com/api/v1/download",
    {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
        "User-Agent": "MagicIPTV v1.0",
      },
      body: { file_id: Number(fileId) },
    },
  ).catch(() => null);

  if (!dlResponse?.link) {
    throw createError({ statusCode: 502, statusMessage: "Failed to get subtitle download link" });
  }

  const subtitleContent = await $fetch<string>(dlResponse.link, { responseType: "text" }).catch(() => null);
  if (!subtitleContent) {
    throw createError({ statusCode: 502, statusMessage: "Failed to download subtitle file" });
  }

  // Parse cues to determine first/last timestamps and cue count
  const info = parseSubtitleInfo(subtitleContent);

  const result = {
    fileId: Number(fileId),
    cues: info.cues,
    firstCueStart: info.first,
    lastCueEnd: info.last,
  };

  // Cache for 6 hours
  cache.set(key, { data: result, expires: Date.now() + 1000 * 60 * 60 * 6 });
  return result;
});

function toSeconds(hms?: string) {
  if (!hms)
    return 0;

  const cleaned = hms.replace(",", ".");
  const parts = cleaned.split(":").map(v => Number(v || 0));
  if (parts.length === 3) {
    const [hh = 0, mm = 0, ss = 0] = parts;
    return hh * 3600 + mm * 60 + ss;
  }
  if (parts.length === 2) {
    const [mm = 0, ss = 0] = parts;
    return mm * 60 + ss;
  }
  return 0;
}

function parseSubtitleInfo(content: string) {
  const lines = content.split(/\r?\n/);
  const timestampRe = /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})/;
  let first: number | null = null;
  let last: number | null = null;
  let cues = 0;

  for (const line of lines) {
    const m = line.match(timestampRe);
    if (m) {
      const start = toSeconds(m[1]);
      const end = toSeconds(m[2]);
      if (first === null || start < first)
        first = start;
      if (last === null || end > last)
        last = end;
      cues++;
    }
  }

  return {
    cues,
    first: first ?? 0,
    last: last ?? 0,
  };
}
