import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

function makePrisma() {
  // Pool size on Vercel serverless. DATABASE_URL MUST point at the Supabase
  // TRANSACTION pooler (Supavisor, :6543), which multiplexes many client
  // connections onto the real Postgres pool. Do NOT point it at the session
  // pooler (:5432) — that hard-caps at 15 client connections and cannot scale;
  // DIRECT_URL (:5432) is migrations only.
  //
  // History: max was 1, chosen after an outage where pg's default of 10 PER
  // lambda exhausted connection slots. But a 2026-08 staging load test showed
  // max:1 serialises every concurrent request through ONE connection — 15
  // concurrent room-message queries took ~3s at max:1 vs ~0.5s at max:8 (6.3x),
  // and chat endpoints (which run ~5 sub-queries each) stalled to 8-19s under
  // load. On the transaction pooler this is safe to raise: client connections
  // are multiplexed, so a modest per-lambda pool doesn't exhaust the real
  // Postgres connections the way direct connections did. idleTimeout releases
  // them promptly so idle instances don't hold slots.
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 15_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
