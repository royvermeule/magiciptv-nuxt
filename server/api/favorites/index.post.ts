import { and, eq } from "drizzle-orm";

import { favorites } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);

  const { streamId, tvgName, streamIcon, type } = await readBody<{
    streamId: number;
    tvgName: string;
    streamIcon?: string;
    type: string;
  }>(event);

  if (!streamId || !tvgName || !type) {
    throw createError({ statusCode: 400, statusMessage: "streamId, tvgName, and type are required" });
  }

  const db = useDb();

  const [existing] = await db.select({ id: favorites.id })
    .from(favorites)
    .where(and(
      eq(favorites.profileId, profileId),
      eq(favorites.streamId, streamId),
      eq(favorites.type, type),
    ))
    .limit(1);

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: "Already favorited" });
  }

  const [created] = await db.insert(favorites)
    .values({ profileId, streamId, tvgName, streamIcon, type })
    .returning();

  return created;
});
