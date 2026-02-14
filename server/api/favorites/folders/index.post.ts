import { favoriteFolders } from "../../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const { name } = await readBody<{ name: string }>(event);

  if (!name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "Folder name is required" });
  }

  const db = useDb();

  const [created] = await db.insert(favoriteFolders)
    .values({ profileId, name: name.trim() })
    .returning();

  return created;
});
