import { and, eq } from "drizzle-orm";

import { favoriteFolders } from "../../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const id = Number(getRouterParam(event, "id"));
  const db = useDb();

  const [deleted] = await db.delete(favoriteFolders)
    .where(and(
      eq(favoriteFolders.id, id),
      eq(favoriteFolders.profileId, profileId),
    ))
    .returning();

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: "Folder not found" });
  }

  return deleted;
});
