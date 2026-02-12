import { useDatabase } from "../database";

export function useDb() {
  const { databaseUrl } = useRuntimeConfig();
  if (!databaseUrl) {
    throw new Error("Missing NUXT_DATABASE_URL environment variable");
  }
  return useDatabase(databaseUrl);
}
