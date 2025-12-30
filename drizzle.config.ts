import { config } from "dotenv";

config({ path: ".env.local" });
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  // Limit introspection to the public schema so drizzle-kit skips Supabase system schemas
  // that can contain constraints drizzle can't parse (avoids the CHECK constraint crash).
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING ?? "",
  },
});
