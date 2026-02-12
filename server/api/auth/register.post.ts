import { users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event);

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, statusMessage: "Email and password are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid email format" });
  }

  if (body.password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: "Password must be at least 8 characters" });
  }

  const db = useDb();

  const existing = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw createError({ statusCode: 409, statusMessage: "Email already registered" });
  }

  const hashedPassword = await hashPassword(body.password);
  const activationToken = generateRefreshToken();

  await db.insert(users).values({
    email: body.email.toLowerCase(),
    password: hashedPassword,
    isActive: false,
    activationToken,
  });

  return { success: true, message: "Registration successful. Please check your email to activate your account." };
});
