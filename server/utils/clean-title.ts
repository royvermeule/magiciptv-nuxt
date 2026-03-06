/**
 * Cleans IPTV stream titles by removing provider-specific prefixes.
 * Examples:
 *   "EN| Game of Thrones" → "Game of Thrones"
 *   "HD| EN| Breaking Bad" → "Breaking Bad"
 *   "[4K] The Matrix" → "The Matrix"
 *   "FR - Inception" → "Inception"
 */
export function cleanTitle(raw: string): string {
  let title = raw.trim();

  // Remove bracketed/parenthesised tags like [EN], (HD), [4K], (UHD)
  // most common short tags are letter-only (2–4 chars) or the `4K` variant
  title = title.replace(/[[(]\s*(?:[A-Z]{2,4}|4K)\s*[\])]/gi, "");

  // Remove pipe-separated prefixes: "EN|", "HD |", "EN | FR|" etc.
  // Greedily strip all leading "TAG |" or "TAG|" segments
  title = title.replace(/^(?:\s*[A-Z0-9]{1,5}\s*\|)+\s*/i, "");

  // Remove leading "TAG -" or "TAG –" prefixes (e.g. "EN - Title")
  title = title.replace(/^[A-Z]{2,4}\s*[-–]\s*/i, "");

  // Remove year in parentheses at the end for cleaner search: "Title (2019)" → "Title"
  title = title.replace(/\s*\(\d{4}\)\s*$/, "");

  return title.trim();
}
