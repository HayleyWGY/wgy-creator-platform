import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

function makePrisma() {
  // max: 1 — critical on Vercel serverless. DATABASE_URL points at the
  // Supabase TRANSACTION pooler (Supavisor, :6543), which multiplexes many
  // client connections onto a small pool of real Postgres connections
  // (server max_connections is 60). The original outage came from pg's
  // default of 10 connections PER lambda instance: with many concurrent
  // lambdas that exhausted the pooler's client slots and took down sign-in.
  // Each lambda serves one request at a time, so one connection is enough;
  // parallel queries within a request queue on it harmlessly. idleTimeout
  // releases it promptly so instances don't hold slots while idle.
  //
  // All runtime DB access flows through this single shared client on the
  // pooler — nothing connects directly (:5432); DIRECT_URL is migrations
  // only. Verified 2026-07: 14/60 connections in use, pooler holding 1.
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
