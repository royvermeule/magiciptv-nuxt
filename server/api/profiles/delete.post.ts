import { profiles } from "~~/server/database/schema";
import { profileId } from "~~/shared/utils/validators";
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

  const body = await readBody(event);
  const result = profileId.safeParse(body);

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message });
  }

  const id = result.data;

  const db = useDb();

  const existing = await db.select({
    id: profiles.id,
  })
    .from(profiles)
    .where(
      and(
        eq(profiles.id, id),
        eq(profiles.userId, payload.userId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    throw createError({ statusCode: 404, statusMessage: `Profile does not exist` });
  }

  await db.delete(profiles)
    .where(
      and(
        eq(profiles.id, id),
        eq(profiles.userId, payload.userId),
      ),
    );
});
