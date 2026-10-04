import { describe, it, expect } from "vitest";
import { appRouter } from "../src/server/trpc/root";
import { db } from "../src/server/db";
import { users } from "../src/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

describe("tRPC End-to-End Procedure Testing", () => {
  const testEmail = `trpc_user_${Date.now()}@example.com`;
  let sessionToken = "";
  let createdDeploymentId = "";

  it("registers a new tenant and sets session cookie", async () => {
    let setCookieHeader = "";
    const mockRes: any = {
      setHeader: (name: string, value: string) => {
        if (name === "Set-Cookie") setCookieHeader = value;
      },
    };
    const mockReq: any = { headers: {} };

    const caller = appRouter.createCaller({
      req: mockReq,
      res: mockRes,
      user: null,
    });

    const result = await caller.auth.register({
      email: testEmail,
      password: "strongpassword123",
    });

    expect(result.id).toBeDefined();
    expect(result.email).toBe(testEmail);
    expect(setCookieHeader).toContain("mini_dokploy_session=");
  });

  it("authenticates and creates an isolated deployment", async () => {
    const user = db.select().from(users).where(eq(users.email, testEmail)).get();
    expect(user).toBeDefined();

    const mockRes: any = { setHeader: () => {} };
    const mockReq: any = { headers: {} };

    // Caller acting as the authenticated user
    const caller = appRouter.createCaller({
      req: mockReq,
      res: mockRes,
      user: user!,
    });

    const deployment = await caller.deployments.create({
      name: "node-api",
      repoUrl: "https://github.com/expressjs/express",
      dockerfilePath: "./Dockerfile",
      exposedPort: 3000,
      customLabels: {
        "env": "production",
      },
      envVars: {
        "NODE_ENV": "production",
        "DATABASE_URL": "sqlite:///app.db",
      },
    });

    expect(deployment.id).toBeDefined();
    expect(deployment.subdomain).toContain("127.0.0.1.sslip.io");
    expect(deployment.status).toBe("pending");
    createdDeploymentId = deployment.id;

    // List user deployments
    const list = await caller.deployments.list();
    expect(list.some((d) => d.id === deployment.id)).toBe(true);

    // Get single deployment
    const fetched = await caller.deployments.get({ id: deployment.id });
    expect(fetched.name).toBe("node-api");
    expect(fetched.exposedPort).toBe(3000);
    expect(fetched.envVarsJson).toContain("DATABASE_URL");
  });
});
