import { and, eq } from "drizzle-orm";

import { favorites } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const id = Number(getRouterParam(event, "id"));
  const { folderId } = await readBody<{ folderId: number | null }>(event);
  const db = useDb();

  const [updated] = await db.update(favorites)
    .set({ folderId })
    .where(and(
      eq(favorites.id, id),
      eq(favorites.profileId, profileId),
    ))
    .returning();

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: "Favorite not found" });
  }

  return updated;
});
