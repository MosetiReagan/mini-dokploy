import { db } from "../src/server/db";
import { users } from "../src/server/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding database...");
  const adminEmail = "admin@dokploy.local";
  const existing = db.select().from(users).where(eq(users.email, adminEmail)).get();

  if (!existing) {
    const passwordHash = await bcrypt.hash("dokploy123", 10);
    db.insert(users)
      .values({
        id: "usr_admin_default",
        email: adminEmail,
        passwordHash,
        role: "admin",
        createdAt: new Date(),
      })
      .run();
    console.log(`Created default user: ${adminEmail} (password: dokploy123)`);
  } else {
    console.log(`User ${adminEmail} already exists.`);
  }

  console.log("Seeding finished successfully.");
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
