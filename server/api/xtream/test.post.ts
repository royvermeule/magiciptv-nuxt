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
  try {
    const response = await $fetch(`${xtreamUrl}/player_api.php`, {
      params: {
        username: xtreamUsername,
        password: xtreamPassword,
      },
    });

    if (!response || typeof response !== "object" || !("user_info" in response)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid response from xtream server" });
    }

    return { success: true };
  }
  catch (e) {
    if (e && typeof e === "object" && "statusCode" in e) {
      throw e;
    }
    throw createError({ statusCode: 400, statusMessage: "Failed to connect to xtream server" });
  }
});
