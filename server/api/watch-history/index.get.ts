import { desc, eq } from "drizzle-orm";

import { watchHistory } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const db = useDb();

  return db.select()
    .from(watchHistory)
    .where(eq(watchHistory.profileId, profileId))
    .orderBy(desc(watchHistory.watchedAt))
    .limit(50);
});
