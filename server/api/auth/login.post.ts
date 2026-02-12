import { refreshTokens, users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event);

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, statusMessage: "Email and password are required" });
  }

  const db = useDb();

  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, body.email.toLowerCase()))
    .limit(1);

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid email or password" });
  }

  const passwordValid = await verifyPassword(body.password, user.password);
  if (!passwordValid) {
    throw createError({ statusCode: 401, statusMessage: "Invalid email or password" });
  }

  if (!user.isActive) {
    throw createError({ statusCode: 403, statusMessage: "Account is not activated" });
  }

  const accessToken = await generateAccessToken(user.id);
  const refreshToken = generateRefreshToken();

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });

  setAuthCookies(event, accessToken, refreshToken);

  return {
    user: {
      id: user.id,
      email: user.email,
    },
  };
});
