import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/server/db";
import { users, sessions, deployments } from "../src/server/db/schema";
import { createSession, getUserFromSession } from "../src/server/auth/session";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("SQLite State Layer & Multi-Tenancy", () => {
  const userAId = `usr_test_a_${crypto.randomUUID()}`;
  const userBId = `usr_test_b_${crypto.randomUUID()}`;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("password123", 10);

    // Create User A
    db.insert(users)
      .values({
        id: userAId,
        email: `alice_${Date.now()}@test.com`,
        passwordHash,
        role: "user",
        createdAt: new Date(),
      })
      .run();

    // Create User B
    db.insert(users)
      .values({
        id: userBId,
        email: `bob_${Date.now()}@test.com`,
        passwordHash,
        role: "user",
        createdAt: new Date(),
      })
      .run();
  });

  it("creates and validates sessions securely", async () => {
    const token = await createSession(userAId);
    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes in hex

    const resolvedUser = await getUserFromSession(token);
    expect(resolvedUser).toBeDefined();
    expect(resolvedUser?.id).toBe(userAId);
  });

  it("returns null for non-existent session token", async () => {
    const resolvedUser = await getUserFromSession("invalid_token_xyz");
    expect(resolvedUser).toBeNull();
  });

  it("enforces tenant data isolation between users", () => {
    const depAId = `dep_a_${crypto.randomUUID()}`;
    const depBId = `dep_b_${crypto.randomUUID()}`;

    // Insert deployment for User A
    db.insert(deployments)
      .values({
        id: depAId,
        userId: userAId,
        name: "service-a",
        repoUrl: "https://github.com/test/service-a",
        dockerfilePath: "./Dockerfile",
        exposedPort: 80,
        subdomain: `app-service-a.${Date.now()}.127.0.0.1.sslip.io`,
        status: "running",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();

    // Insert deployment for User B
    db.insert(deployments)
      .values({
        id: depBId,
        userId: userBId,
        name: "service-b",
        repoUrl: "https://github.com/test/service-b",
        dockerfilePath: "./Dockerfile",
        exposedPort: 3000,
        subdomain: `app-service-b.${Date.now()}.127.0.0.1.sslip.io`,
        status: "running",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();

    // Query deployments for User A
    const userADeployments = db.select().from(deployments).where(eq(deployments.userId, userAId)).all();
    expect(userADeployments.some((d) => d.id === depAId)).toBe(true);
    expect(userADeployments.some((d) => d.id === depBId)).toBe(false);

    // Query deployments for User B
    const userBDeployments = db.select().from(deployments).where(eq(deployments.userId, userBId)).all();
    expect(userBDeployments.some((d) => d.id === depBId)).toBe(true);
    expect(userBDeployments.some((d) => d.id === depAId)).toBe(false);
  });
});
