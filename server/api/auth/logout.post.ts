import { refreshTokens } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "refresh_token");

  if (token) {
    const db = useDb();
    await db.update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token, token));
  }

  clearAuthCookies(event);

  return { success: true };
});
