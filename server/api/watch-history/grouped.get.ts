import { desc, eq } from "drizzle-orm";

import { watchHistory } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const db = useDb();

  // Fetch last 200 to have enough rows to group
  const rows = await db
    .select()
    .from(watchHistory)
    .where(eq(watchHistory.profileId, profileId))
    .orderBy(desc(watchHistory.watchedAt))
    .limit(200);

  // Keep only the most recent entry per (type, series grouping key)
  const seen = new Set<string>();
  const grouped = rows.filter((row) => {
    // Movies: key by streamId. Series: key by seriesId.
    const key = row.type === "series"
      ? `series:${row.seriesId}`
      : `movie:${row.streamId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return grouped;
});
