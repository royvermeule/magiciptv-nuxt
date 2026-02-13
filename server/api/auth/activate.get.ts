import { users } from "~~/server/database/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const query = getQuery<{ token: string }>(event);

  if (!query.token) {
    throw createError({ statusCode: 400, statusMessage: "Missing activation token" });
  }

  const db = useDb();

  const [user] = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.activationToken, query.token))
    .limit(1);

  if (!user) {
    throw createError({ statusCode: 400, statusMessage: "Invalid activation token" });
  }

  await db.update(users)
    .set({ isActive: true, activationToken: null })
    .where(eq(users.id, user.id));

  return sendRedirect(event, "/login?activated=true");
});
