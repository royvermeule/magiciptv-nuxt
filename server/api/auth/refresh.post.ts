import { refreshTokens } from "~~/server/database/schema";
import { and, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "refresh_token");

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "No refresh token" });
  }

  const db = useDb();

  const [storedToken] = await db.select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.token, token),
      eq(refreshTokens.revoked, false),
    ))
    .limit(1);

  if (!storedToken) {
    throw createError({ statusCode: 401, statusMessage: "Invalid refresh token" });
  }

  if (new Date(storedToken.expiresAt) < new Date()) {
    await db.update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, storedToken.id));
    clearAuthCookies(event);
    throw createError({ statusCode: 401, statusMessage: "Refresh token expired" });
  }

  // Revoke old refresh token (rotation)
  await db.update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, storedToken.id));

  // Generate new token pair
  const newAccessToken = await generateAccessToken(storedToken.userId);
  const newRefreshToken = generateRefreshToken();

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId: storedToken.userId,
    token: newRefreshToken,
    expiresAt,
  });

  setAuthCookies(event, newAccessToken, newRefreshToken);

  return { success: true };
});
