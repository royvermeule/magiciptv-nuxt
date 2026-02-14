import { testXtreamConnection } from "~~/server/utils/xtream";
import { xtreamTestSchema } from "~~/shared/utils/validators";

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, "access_token");

  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: "Invalid or expired token" });
  }

  const body = await readBody(event);
  const result = xtreamTestSchema.safeParse(body);

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message });
  }

  const { xtreamUsername, xtreamPassword, xtreamUrl } = result.data;
  await testXtreamConnection(xtreamUsername, xtreamPassword, xtreamUrl);
  return { success: true };
});
