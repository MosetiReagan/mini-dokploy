import { describe, it, expect } from "vitest";
import { buildService } from "../src/server/services/build.service";
import path from "path";

describe("BuildService & Security Hardening", () => {
  it("rejects path traversal attempts in Dockerfile path", () => {
    const maliciousPaths = [
      "../../../../etc/passwd",
      "/etc/shadow",
      "../Dockerfile",
      "subdir/../../../../app/server.ts",
    ];

    for (const p of maliciousPaths) {
      expect(() => {
        (buildService as any).validateDockerfilePath(path.resolve("/tmp/test-workspace"), p);
      }).toThrow(/Security Violation|traversal/i);
    }
  });

  it("accepts safe relative Dockerfile paths", () => {
    const safePaths = [
      "./Dockerfile",
      "Dockerfile",
      "docker/Dockerfile",
      "./src/Dockerfile.prod",
    ];

    const mockWorkspace = path.resolve("/tmp/test-workspace");
    for (const p of safePaths) {
      const resolved = (buildService as any).validateDockerfilePath(mockWorkspace, p);
      expect(resolved.startsWith(mockWorkspace)).toBe(true);
    }
  });
});
