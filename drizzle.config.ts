import { defineConfig } from "drizzle-kit";

const dbCredentials = {
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.POSTGRES_DATABASE || "askmymoney",
  ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false,
};

if (process.env.NODE_ENV === 'test') {
  dbCredentials.database = 'askmymoney_test';
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials,
});
