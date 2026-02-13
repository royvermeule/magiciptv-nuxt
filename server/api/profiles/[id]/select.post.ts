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

  const body = await readBody(event);

  const db = useDb();

  const existing = await db.select({
    id: profiles.id,
    pin: profiles.pin,
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
    throw createError({ statusCode: 404, statusMessage: "Profile does not exist" });
  }

  if (existing[0]?.pin && existing[0]?.pin !== body?.pin) {
    throw createError({ statusCode: 403, statusMessage: "Invalid pin" });
  }

  setCookie(event, "profile_id", String(id), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return { success: true };
});
