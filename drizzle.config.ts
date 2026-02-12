import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/database/schema.ts",
  out: "./server/database/migrations",
  dbCredentials: {
    // drizzle-kit runs outside Nuxt, so process.env is acceptable here
    // eslint-disable-next-line node/no-process-env
    url: process.env.DATABASE_URL!,
  },
});
