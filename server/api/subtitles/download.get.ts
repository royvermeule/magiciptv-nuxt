export default defineEventHandler(async (event) => {
  await getProfileId(event);

  const { fileId } = getQuery<{ fileId: string }>(event);

  if (!fileId) {
    throw createError({ statusCode: 400, statusMessage: "fileId is required" });
  }

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

  // Fetch the actual subtitle file content
  const subtitleContent = await $fetch<string>(dlResponse.link, {
    responseType: "text",
  }).catch(() => null);

  if (!subtitleContent) {
    throw createError({ statusCode: 502, statusMessage: "Failed to download subtitle file" });
  }

  // Return as WebVTT — convert from SRT if needed
  const vtt = toWebVTT(subtitleContent);

  setResponseHeader(event, "Content-Type", "text/vtt; charset=utf-8");
  // Use send() to return raw text — avoid H3 JSON-serializing the string
  return send(event, vtt, "text/vtt; charset=utf-8");
});

function toWebVTT(content: string): string {
  const trimmed = content.trim();

  // Already VTT
  if (trimmed.startsWith("WEBVTT")) {
    return trimmed;
  }

  // Convert SRT to VTT
  const vtt = trimmed
    // Replace SRT timestamp commas with VTT dots
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    // Remove SRT sequence numbers (lines that are just digits before timestamps)
    .replace(/^\d+\s*\n(?=\d{2}:\d{2}:\d{2})/gm, "");

  return `WEBVTT\n\n${vtt}`;
}
