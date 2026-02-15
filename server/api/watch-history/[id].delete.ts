import { and, eq } from "drizzle-orm";

import { watchHistory } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const id = Number(getRouterParam(event, "id"));

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id is required" });
  }

  const db = useDb();

  const [deleted] = await db.delete(watchHistory)
    .where(and(
      eq(watchHistory.id, id),
      eq(watchHistory.profileId, profileId),
    ))
    .returning({ id: watchHistory.id });

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Watch history entry not found" });
  }

  return { success: true };
});
