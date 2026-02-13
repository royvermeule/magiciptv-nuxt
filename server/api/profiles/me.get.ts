import { profiles } from "~~/server/database/schema";
import { eq, isNotNull } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token");

  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: "Invalid or expired token" });
  }

  const db = useDb();
  const userProfiles = await db.select({
    id: profiles.id,
    name: profiles.name,
    hasPin: isNotNull(profiles.pin),
  })
    .from(profiles)
    .where(eq(profiles.userId, payload.userId));

  return userProfiles;
});
