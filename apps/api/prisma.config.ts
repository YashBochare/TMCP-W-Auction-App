// Prisma 7 configuration — loads environment variables from the monorepo root .env
// and configures the datasource for both runtime (pooler) and migrations (direct).
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "prisma/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from monorepo root (two levels up from apps/api/)
dotenv.config({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    directUrl: process.env["DIRECT_URL"],
  },
});
