import { and, eq } from "drizzle-orm";

import { watchHistory } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const { seriesId } = getQuery<{ seriesId: string }>(event);

  if (!seriesId) {
    throw createError({ statusCode: 400, statusMessage: "seriesId is required" });
  }

  const db = useDb();

  await db.delete(watchHistory).where(
    and(
      eq(watchHistory.profileId, profileId),
      eq(watchHistory.seriesId, Number(seriesId)),
    ),
  );

  return { success: true };
});
