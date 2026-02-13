import { resetTokens, users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token: string; password: string }>(event);

  if (!body.token || !body.password) {
    throw createError({ statusCode: 400, statusMessage: "Token and password are required" });
  }

  if (body.password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: "Password must be at least 8 characters" });
  }

  const db = useDb();

  const [storedToken] = await db.select()
    .from(resetTokens)
    .where(eq(resetTokens.token, body.token))
    .limit(1);

  if (!storedToken) {
    throw createError({ statusCode: 400, statusMessage: "Invalid or expired reset token" });
  }

  if (new Date(storedToken.expiresAt) < new Date()) {
    await db.delete(resetTokens).where(eq(resetTokens.id, storedToken.id));
    throw createError({ statusCode: 400, statusMessage: "Reset token has expired" });
  }

  const hashedPassword = await hashPassword(body.password);

  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, storedToken.userId));

  await db.delete(resetTokens).where(eq(resetTokens.id, storedToken.id));

  return { success: true, message: "Password reset successful. You can now sign in." };
});
