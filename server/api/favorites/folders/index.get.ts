import { eq } from "drizzle-orm";

import { favoriteFolders } from "../../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const db = useDb();

  return db.select()
    .from(favoriteFolders)
    .where(eq(favoriteFolders.profileId, profileId));
});
