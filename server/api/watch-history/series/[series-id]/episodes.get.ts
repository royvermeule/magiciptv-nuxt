import { and, eq } from "drizzle-orm";

import { watchHistory } from "../../../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const seriesId = Number(getRouterParam(event, "series-id"));

  if (!seriesId) {
    throw createError({ statusCode: 400, statusMessage: "seriesId is required" });
  }

  const db = useDb();

  return db
    .select({
      streamId: watchHistory.streamId,
      currentTime: watchHistory.currentTime,
      duration: watchHistory.duration,
    })
    .from(watchHistory)
    .where(
      and(
        eq(watchHistory.profileId, profileId),
        eq(watchHistory.seriesId, seriesId),
      ),
    );
});
