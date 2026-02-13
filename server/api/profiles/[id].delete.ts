import { profiles } from "~~/server/database/schema";
import { and, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token");

  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: "Invalid or expired token" });
  }

  const id = Number(getRouterParam(event, "id"));
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid profile ID" });
  }

  const db = useDb();

  const deleted = await db.delete(profiles)
    .where(
      and(
        eq(profiles.id, id),
        eq(profiles.userId, payload.userId),
      ),
    )
    .returning({ id: profiles.id });

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "Profile does not exist" });
  }
});
