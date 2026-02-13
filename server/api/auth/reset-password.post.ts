import { resetTokens, users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = resetPasswordSchema.safeParse(body);

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message });
  }

  const { token, password } = result.data;
  const db = useDb();

  const [storedToken] = await db.select()
    .from(resetTokens)
    .where(eq(resetTokens.token, token))
    .limit(1);

  if (!storedToken) {
    throw createError({ statusCode: 400, statusMessage: "Invalid or expired reset token" });
  }

  if (new Date(storedToken.expiresAt) < new Date()) {
    await db.delete(resetTokens).where(eq(resetTokens.id, storedToken.id));
    throw createError({ statusCode: 400, statusMessage: "Reset token has expired" });
  }

  const hashedPassword = await hashPassword(password);

  await db.update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, storedToken.userId));

  await db.delete(resetTokens).where(eq(resetTokens.id, storedToken.id));

  return { success: true, message: "Password reset successful. You can now sign in." };
});
