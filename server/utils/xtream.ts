import type { H3Event } from "h3";

import { and, eq } from "drizzle-orm";

import { profiles } from "../database/schema";

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

export async function getProfileId(event: H3Event): Promise<number> {
  const accessToken = getCookie(event, "access_token");
  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  const payload = await verifyAccessToken(accessToken);
  if (!payload) {
    throw createError({ statusCode: 401, statusMessage: "Invalid or expired token" });
  }

  const profileId = getCookie(event, "profile_id");
  if (!profileId) {
    throw createError({ statusCode: 400, statusMessage: "No profile selected" });
  }

  const db = useDb();
  const [profile] = await db.select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.id, Number(profileId)),
        eq(profiles.userId, payload.userId),
      ),
    )
    .limit(1);

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: "Profile not found" });
  }

  return profile.id;
}

export async function getXtreamCredentials(event: H3Event) {
  const profileId = await getProfileId(event);

  const db = useDb();
  const [profile] = await db.select({
    xtreamUsername: profiles.xtreamUsername,
    xtreamPassword: profiles.xtreamPassword,
    xtreamUrl: profiles.xtreamUrl,
  })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  if (!profile || !profile.xtreamUsername || !profile.xtreamPassword || !profile.xtreamUrl) {
    throw createError({ statusCode: 404, statusMessage: "Profile not found" });
  }

  return {
    xtreamUsername: profile.xtreamUsername,
    xtreamPassword: profile.xtreamPassword,
    xtreamUrl: profile.xtreamUrl,
  };
}
