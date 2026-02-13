import { profiles } from "~~/server/database/schema";
import { profileSchema } from "~~/shared/utils/validators";
import { and, eq, ilike } from "drizzle-orm";

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
  const result = profileSchema.safeParse(body);

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message });
  }

  const { name } = result.data;

  const db = useDb();

  const existing = await db.select({
    id: profiles.id,
  })
    .from(profiles)
    .where(
      and(
        ilike(profiles.name, name),
        eq(profiles.userId, payload.userId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw createError({ statusCode: 409, statusMessage: `Profile with the name "${name}" already exists` });
  }

  const [newProfile] = await db.insert(profiles)
    .values({
      userId: payload.userId,
      name,
    })
    .returning({
      id: profiles.id,
      name: profiles.name,
    });

  return newProfile;
});
