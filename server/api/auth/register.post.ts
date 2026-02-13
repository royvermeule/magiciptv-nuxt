import { users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message });
  }

  const { email, password } = result.data;

  const db = useDb();

  const existing = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw createError({ statusCode: 409, statusMessage: "Email already registered" });
  }

  const hashedPassword = await hashPassword(password);
  const activationToken = generateRefreshToken();

  await db.insert(users).values({
    email: email.toLowerCase(),
    password: hashedPassword,
    isActive: false,
    activationToken,
  });

  const { appUrl } = useRuntimeConfig();
  const activationLink = `${appUrl}/api/auth/activate?token=${activationToken}`;

  await sendMail(
    email.toLowerCase(),
    "Activate your MagicIPTV account",
    `<h1>Welcome to MagicIPTV!</h1>
    <p>Click the link below to activate your account:</p>
    <p><a href="${activationLink}">Activate Account</a></p>
    <p>If you didn't create this account, you can ignore this email.</p>`,
  );

  return { success: true, message: "Registration successful. Please check your email to activate your account." };
});
