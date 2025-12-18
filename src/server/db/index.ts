import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to your environment before using the database.");
}

const client = postgres(connectionString, {
  max: 1,
  prepare: false,
  ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
});

export const db = drizzle(client);
