import { describe, it, expect } from "vitest";
import { dockerService } from "../src/server/services/docker.service";

describe("DockerService & Traefik Label Engine", () => {
  it("generates deterministic Traefik routing labels", () => {
    const labels = dockerService.generateTraefikLabels({
      serviceName: "dokploy-app-1",
      subdomain: "app-test-123.127.0.0.1.sslip.io",
      exposedPort: 8080,
    });

    expect(labels["traefik.enable"]).toBe("true");
    expect(labels["traefik.docker.network"]).toBe("mini-dokploy-net");
    expect(labels["traefik.http.routers.dokploy-app-1.rule"]).toBe("Host(`app-test-123.127.0.0.1.sslip.io`)");
    expect(labels["traefik.http.routers.dokploy-app-1.entrypoints"]).toBe("web");
    expect(labels["traefik.http.services.dokploy-app-1.loadbalancer.server.port"]).toBe("8080");
  });

  it("merges custom user Docker labels without overriding Traefik system invariants", () => {
    const customLabels = {
      "app.environment": "staging",
      "monitoring.prometheus": "true",
      "team": "core",
    };

    const labels = dockerService.generateTraefikLabels({
      serviceName: "api-backend",
      subdomain: "app-api-999.127.0.0.1.sslip.io",
      exposedPort: 3000,
      customLabels,
    });

    expect(labels["app.environment"]).toBe("staging");
    expect(labels["monitoring.prometheus"]).toBe("true");
    expect(labels["team"]).toBe("core");
    expect(labels["traefik.enable"]).toBe("true");
    expect(labels["traefik.http.services.api-backend.loadbalancer.server.port"]).toBe("3000");
  });

  it("generates valid and sanitized sslip.io subdomains", () => {
    const subdomain = dockerService.generateSubdomain("My Awesome App! @2026", "dep_7e35ca42-ef34-4c54");
    expect(subdomain).toMatch(/^app-my-awesome-app-.*\.127\.0\.0\.1\.sslip\.io$/);
    expect(subdomain).not.toContain("!");
    expect(subdomain).not.toContain("@");
    expect(subdomain).not.toContain(" ");
  });

  it("handles mock Swarm service creation when daemon is not present", async () => {
    const serviceId = await dockerService.createService({
      deploymentId: "dep_test_123",
      name: "test-app",
      imageTag: "mini-dokploy/test-app:latest",
      subdomain: "app-test-123.127.0.0.1.sslip.io",
      exposedPort: 80,
    });

    expect(serviceId).toContain("dokploy-");
  });

  it("retrieves inspect details for a Swarm service", async () => {
    const details = await dockerService.getServiceDetails("mock-srv-dokploy-12345");
    expect(details.id).toBe("mock-srv-dokploy-12345");
    expect(details.replicas).toBe(1);
    expect(details.tasks).toBeDefined();
    expect(details.tasks.length).toBeGreaterThan(0);
  });
});
