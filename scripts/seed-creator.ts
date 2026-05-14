import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("Creator123!", 10);

  const creator = await prisma.creator.upsert({
    where: { email: "hayley@wegotyouagency.com" },
    update: {},
    create: {
      email: "hayley@wegotyouagency.com",
      passwordHash,
      firstName: "Hayley",
      lastName: "Walker",
      isAdmin: false,
      membershipStatus: "active",
      membershipType: "paid",
    },
  });

  console.log("Creator account created:", creator.email);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
