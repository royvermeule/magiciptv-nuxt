import { resetTokens, users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = forgotPasswordSchema.safeParse(body);

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0].message });
  }

  const { email } = result.data;
  const db = useDb();

  const [user] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  // Always return success to prevent user enumeration
  if (user) {
    const token = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(resetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const { appUrl } = useRuntimeConfig();
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await sendMail(
      email.toLowerCase(),
      "Reset your MagicIPTV password",
      `<h1>Password Reset</h1>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can ignore this email.</p>`,
    );
  }

  return { success: true, message: "If an account with that email exists, a reset link has been sent." };
});
