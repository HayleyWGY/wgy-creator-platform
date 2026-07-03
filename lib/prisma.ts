import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

function makePrisma() {
  // max: 1 — critical on Vercel serverless. The Supabase pooler (session
  // mode) allows only 15 clients total; pg's default of 10 connections PER
  // lambda instance exhausted it and took down sign-in (EMAXCONNSESSION).
  // Each lambda serves one request at a time, so one connection is enough;
  // parallel queries within a request queue on it harmlessly.
  const adapter = new PrismaPg({
    connectionString,
    max: 1,
    idleTimeoutMillis: 15_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
