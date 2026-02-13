import { profiles } from "~~/server/database/schema";
import { profileUpdateSchema } from "~~/shared/utils/validators";
import { and, eq, isNotNull } from "drizzle-orm";

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
  const result = profileUpdateSchema.safeParse(body);

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message });
  }

  const { name, xtreamUsername, xtreamPassword, xtreamUrl, pin, newPin, removePin } = result.data;

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
    throw createError({ statusCode: 404, statusMessage: `Profile does not exist` });
  }

  if (existing[0]?.pin && existing[0]?.pin !== pin) {
    throw createError({ statusCode: 403, statusMessage: "Invalid pin" });
  }

  const updateData: Record<string, string | null> = { name };
  if (xtreamUsername !== undefined) {
    updateData.xtreamUsername = xtreamUsername;
  }
  if (xtreamPassword !== undefined) {
    updateData.xtreamPassword = xtreamPassword;
  }
  if (xtreamUrl !== undefined) {
    updateData.xtreamUrl = xtreamUrl;
  }
  if (removePin) {
    updateData.pin = null;
  }
  else if (newPin !== undefined) {
    updateData.pin = newPin;
  }

  const [updated] = await db.update(profiles)
    .set(updateData)
    .where(
      and(
        eq(profiles.id, id),
        eq(profiles.userId, payload.userId),
      ),
    )
    .returning({
      id: profiles.id,
      name: profiles.name,
      hasPin: isNotNull(profiles.pin),
    });

  return updated;
});
