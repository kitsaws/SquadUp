import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton instance of PrismaClient.
 * In development, Node.js hot-reloading can create multiple PrismaClient instances
 * which quickly exhausts database connection limits. Storing it on globalThis prevents this.
 */
export const prisma: PrismaClient =
  globalThis.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export const db = prisma;
export default prisma;
