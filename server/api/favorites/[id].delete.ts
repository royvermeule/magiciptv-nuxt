import { and, eq } from "drizzle-orm";

import { favorites } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const id = Number(getRouterParam(event, "id"));

  const db = useDb();

  const [deleted] = await db.delete(favorites)
    .where(and(
      eq(favorites.id, id),
      eq(favorites.profileId, profileId),
    ))
    .returning();

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Favorite not found" });
  }

  return deleted;
});
