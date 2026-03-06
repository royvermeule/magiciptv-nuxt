import { and, eq } from "drizzle-orm";

import { watchHistory } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const { streamId, type } = getQuery<{ streamId: string; type: string }>(event);

  if (!streamId || !type) {
    throw createError({ statusCode: 400, statusMessage: "streamId and type are required" });
  }

  const db = useDb();

  const [entry] = await db.select({
    currentTime: watchHistory.currentTime,
    duration: watchHistory.duration,
  })
    .from(watchHistory)
    .where(and(
      eq(watchHistory.profileId, profileId),
      eq(watchHistory.streamId, Number(streamId)),
      eq(watchHistory.type, type),
    ))
    .limit(1);

  return entry ?? null;
});
