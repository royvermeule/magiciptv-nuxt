import { eq } from "drizzle-orm";

import { favorites } from "../../database/schema";

export default defineEventHandler(async (event) => {
  const profileId = await getProfileId(event);
  const db = useDb();

  return db.select()
    .from(favorites)
    .where(eq(favorites.profileId, profileId));
});
