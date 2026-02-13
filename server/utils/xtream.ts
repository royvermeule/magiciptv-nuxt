export async function testXtreamConnection(
  xtreamUsername: string,
  xtreamPassword: string,
  xtreamUrl: string,
): Promise<void> {
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
  }
  catch (e) {
    if (e && typeof e === "object" && "statusCode" in e) {
      throw e;
    }
    throw createError({ statusCode: 400, statusMessage: "Failed to connect to xtream server" });
  }
}
