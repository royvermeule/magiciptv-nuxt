import { and, eq } from "drizzle-orm";

import { watchHistory } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);

  const body = await readBody<{
    streamId: number;
    type: "movie" | "series";
    title: string;
    icon?: string;
    seriesName?: string;
    seriesId?: number;
    seasonNumber?: string;
    episodeNumber?: number;
    containerExtension?: string;
    currentTime: number;
    duration: number;
  }>(event);

  if (!body.streamId || !body.type || !body.title) {
    throw createError({ statusCode: 400, statusMessage: "streamId, type, and title are required" });
  }

  const db = useDb();

  const [existing] = await db.select({ id: watchHistory.id })
    .from(watchHistory)
    .where(and(
      eq(watchHistory.profileId, profileId),
      eq(watchHistory.streamId, body.streamId),
      eq(watchHistory.type, body.type),
    ))
    .limit(1);

  if (existing) {
    const [updated] = await db.update(watchHistory)
      .set({
        currentTime: body.currentTime,
        duration: body.duration,
        title: body.title,
        icon: body.icon,
        seriesName: body.seriesName,
        seriesId: body.seriesId,
        seasonNumber: body.seasonNumber,
        episodeNumber: body.episodeNumber,
        containerExtension: body.containerExtension,
        watchedAt: new Date(),
      })
      .where(eq(watchHistory.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(watchHistory)
    .values({
      profileId,
      streamId: body.streamId,
      type: body.type,
      title: body.title,
      icon: body.icon,
      seriesName: body.seriesName,
      seriesId: body.seriesId,
      seasonNumber: body.seasonNumber,
      episodeNumber: body.episodeNumber,
      containerExtension: body.containerExtension,
      currentTime: body.currentTime,
      duration: body.duration,
    })
    .returning();

  return created;
});
