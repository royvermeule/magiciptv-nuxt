import { and, eq } from "drizzle-orm";

import { refreshTokens } from "../database/schema";

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token");
  const refreshToken = getCookie(event, "refresh_token");

  // Only run if access token is missing/expired but refresh token exists
  if (accessToken || !refreshToken) {
    return;
  }

  const db = useDb();

  const [storedToken] = await db.select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.token, refreshToken),
      eq(refreshTokens.revoked, false),
    ))
    .limit(1);

  if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
    return;
  }

  // Revoke old token (rotation)
  await db.update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, storedToken.id));

  // Generate new token pair
  const newAccessToken = await generateAccessToken(storedToken.userId);
  const newRefreshToken = generateRefreshToken();

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokens).values({
    userId: storedToken.userId,
    token: newRefreshToken,
    expiresAt,
  });

  setAuthCookies(event, newAccessToken, newRefreshToken);
});
