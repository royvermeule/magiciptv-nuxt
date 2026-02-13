import { profiles } from "~~/server/database/schema";
import { profileSchema } from "~~/shared/utils/validators";
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

  const body = await readBody(event);
  const result = profileSchema.safeParse(body);

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message });
  }

  const { name, xtreamUsername, xtreamPassword, xtreamUrl, pin } = result.data;

  const db = useDb();

  const existing = await db.select({
    id: profiles.id,
    name: profiles.name,
  })
    .from(profiles)
    .where(
      eq(profiles.userId, payload.userId),
    )
    .limit(10);

  if (existing.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    throw createError({ statusCode: 409, statusMessage: `Profile with the name "${name}" already exists` });
  }

  if (existing.length >= 10) {
    throw createError({ statusCode: 409, statusMessage: `Your profile limit of 10 profiles has been reached` });
  }

  const [newProfile] = await db.insert(profiles)
    .values({
      userId: payload.userId,
      name,
      xtreamUsername,
      xtreamPassword,
      xtreamUrl,
      pin,
    })
    .returning({
      id: profiles.id,
      name: profiles.name,
      hasPin: isNotNull(profiles.pin),
    });

  return newProfile;
});
