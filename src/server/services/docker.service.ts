import Docker from "dockerode";
import { logService } from "./log.service";

export interface TraefikLabelOptions {
  serviceName: string;
  subdomain: string;
  exposedPort: number;
  customLabels?: Record<string, string>;
  networkName?: string;
}

export interface CreateServiceOptions {
  deploymentId: string;
  name: string;
  imageTag: string;
  subdomain: string;
  exposedPort: number;
  customLabels?: Record<string, string>;
  envVars?: Record<string, string>;
}

export class DockerService {
  private docker: Docker;
  private networkName: string;
  private sslipSuffix: string;
  private isDaemonAvailable: boolean | null = null;

  constructor() {
    const socketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
    this.docker = new Docker({ socketPath });
    this.networkName = process.env.TRAEFIK_NETWORK || "mini-dokploy-net";
    this.sslipSuffix = process.env.SSIP_HOST_SUFFIX || "127.0.0.1.sslip.io";
  }

  /**
   * Generates deterministic Traefik labels merged with optional user custom labels
   */
  public generateTraefikLabels(options: TraefikLabelOptions): Record<string, string> {
    const routerName = options.serviceName.replace(/[^a-zA-Z0-9_-]/g, "");
    const network = options.networkName || this.networkName;

    const baseLabels: Record<string, string> = {
      "traefik.enable": "true",
      "traefik.docker.network": network,
      [`traefik.http.routers.${routerName}.rule`]: `Host(\`${options.subdomain}\`)`,
      [`traefik.http.routers.${routerName}.entrypoints`]: "web",
      [`traefik.http.services.${routerName}.loadbalancer.server.port`]: String(options.exposedPort),
    };

    if (options.customLabels) {
      for (const [key, value] of Object.entries(options.customLabels)) {
        if (key && value !== undefined) {
          baseLabels[key.trim()] = String(value).trim();
        }
      }
    }

    return baseLabels;
  }

  /**
   * Generates a clean sslip.io subdomain for the deployment
   */
  public generateSubdomain(deploymentName: string, deploymentId: string): string {
    const cleanName = deploymentName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32)
      .replace(/-+$/, "");
    const cleanId = deploymentId.toLowerCase().replace(/[^a-z0-9]/g, "");
    const shortId = cleanId.slice(0, 8);
    return `app-${cleanName || "service"}-${shortId}.${this.sslipSuffix}`;
  }

  /**
   * Checks if Docker daemon and Swarm mode are operational
   */
  public async checkSwarmStatus(): Promise<{ active: boolean; swarmActive: boolean }> {
    try {
      const info = await this.docker.info();
      const swarmActive = info.Swarm && info.Swarm.LocalNodeState === "active";
      this.isDaemonAvailable = true;
      return { active: true, swarmActive: !!swarmActive };
    } catch (err) {
      this.isDaemonAvailable = false;
      return { active: false, swarmActive: false };
    }
  }

  /**
   * Creates a Docker Swarm service for a deployment
   */
  public async createService(options: CreateServiceOptions): Promise<string> {
    const serviceName = `dokploy-${options.deploymentId.slice(0, 12)}`;
    const labels = this.generateTraefikLabels({
      serviceName,
      subdomain: options.subdomain,
      exposedPort: options.exposedPort,
      customLabels: options.customLabels,
      networkName: this.networkName,
    });

    await logService.emitLog(
      options.deploymentId,
      `[Docker Swarm] Orchestrating service '${serviceName}' on network '${this.networkName}'...`,
      "info"
    );

    const swarmState = await this.checkSwarmStatus();

    if (!swarmState.active) {
      await logService.emitLog(
        options.deploymentId,
        `[Docker Swarm] Daemon not detected locally. Simulating Swarm Service create for '${serviceName}'.`,
        "warn"
      );
      await logService.emitLog(
        options.deploymentId,
        `[Traefik Ingress] Registered Traefik Host router for '${options.subdomain}' -> port ${options.exposedPort}`,
        "success"
      );
      return `mock-srv-${serviceName}`;
    }

    try {
      const envArray = options.envVars
        ? Object.entries(options.envVars).map(([k, v]) => `${k}=${v}`)
        : [];

      const serviceSpec = {
        Name: serviceName,
        TaskTemplate: {
          ContainerSpec: {
            Image: options.imageTag,
            Labels: labels,
            Env: envArray.length > 0 ? envArray : undefined,
          },
          Networks: [{ Target: this.networkName }],
          Resources: {
            Limits: {
              MemoryBytes: 512 * 1024 * 1024, // 512 MB default memory limit
            },
          },
          RestartPolicy: {
            Condition: "on-failure" as const,
            Delay: 5000000000, // 5s in nanoseconds
            MaxAttempts: 3,
          },
        },
        Mode: {
          Replicated: {
            Replicas: 1,
          },
        },
        UpdateConfig: {
          Parallelism: 1,
          Delay: 5000000000, // 5s
          FailureAction: "rollback" as const,
          Order: "start-first" as const, // Zero-downtime rolling deployment
        },
        RollbackConfig: {
          Parallelism: 1,
          Order: "stop-first" as const,
        },
        Labels: labels,
      };

      const service = await this.docker.createService(serviceSpec);
      const serviceId = (service as any).id || (service as any).ID || serviceName;

      await logService.emitLog(
        options.deploymentId,
        `[Docker Swarm] Service successfully created with ID: ${serviceId}`,
        "success"
      );
      await logService.emitLog(
        options.deploymentId,
        `[Traefik Ingress] Subdomain route verified: http://${options.subdomain}`,
        "success"
      );

      return serviceId;
    } catch (err: any) {
      await logService.emitLog(
        options.deploymentId,
        `[Docker Swarm Error] Failed to create service: ${err.message}`,
        "error"
      );
      throw err;
    }
  }

  /**
   * Updates an existing Docker Swarm service (e.g. on redeploy)
   */
  public async updateService(
    serviceId: string,
    options: CreateServiceOptions
  ): Promise<void> {
    if (serviceId.startsWith("mock-srv-")) {
      await logService.emitLog(
        options.deploymentId,
        `[Docker Swarm] Simulated Swarm Service update with new image '${options.imageTag}'.`,
        "success"
      );
      return;
    }

    try {
      const service = this.docker.getService(serviceId);
      const inspectData = await service.inspect();
      const version = inspectData.Version.Index;

      const serviceName = `dokploy-${options.deploymentId.slice(0, 12)}`;
      const labels = this.generateTraefikLabels({
        serviceName,
        subdomain: options.subdomain,
        exposedPort: options.exposedPort,
        customLabels: options.customLabels,
        networkName: this.networkName,
      });

      const envArray = options.envVars
        ? Object.entries(options.envVars).map(([k, v]) => `${k}=${v}`)
        : inspectData.Spec?.TaskTemplate?.ContainerSpec?.Env || [];

      const updatedSpec = {
        ...inspectData.Spec,
        TaskTemplate: {
          ...inspectData.Spec.TaskTemplate,
          ContainerSpec: {
            ...inspectData.Spec.TaskTemplate.ContainerSpec,
            Image: options.imageTag,
            Labels: labels,
            Env: envArray,
          },
        },
        UpdateConfig: {
          Parallelism: 1,
          Delay: 5000000000,
          FailureAction: "rollback",
          Order: "start-first",
        },
        Labels: labels,
      };

      await service.update({ version }, updatedSpec);
      await logService.emitLog(
        options.deploymentId,
        `[Docker Swarm] Service ${serviceId} updated to image: ${options.imageTag} (rolling update: start-first)`,
        "success"
      );
    } catch (err: any) {
      await logService.emitLog(
        options.deploymentId,
        `[Docker Swarm Error] Failed to update service: ${err.message}`,
        "error"
      );
      throw err;
    }
  }

  /**
   * Retrieves inspection details for a Swarm service
   */
  public async getServiceDetails(serviceId: string): Promise<any> {
    if (serviceId.startsWith("mock-srv-")) {
      return {
        id: serviceId,
        mock: true,
        replicas: 1,
        updateStatus: "completed",
        tasks: [{ id: "mock-task-1", state: "running", desiredState: "running" }],
      };
    }

    try {
      const service = this.docker.getService(serviceId);
      const inspectData = await service.inspect();
      let tasks: any[] = [];
      try {
        tasks = await this.docker.listTasks({
          filters: { service: [serviceId] },
        });
      } catch {}

      return {
        id: serviceId,
        name: inspectData.Spec?.Name,
        image: inspectData.Spec?.TaskTemplate?.ContainerSpec?.Image,
        labels: inspectData.Spec?.Labels,
        replicas: inspectData.Spec?.Mode?.Replicated?.Replicas || 1,
        tasks: tasks.map((t) => ({
          id: t.ID,
          nodeId: t.NodeID,
          state: t.Status?.State,
          desiredState: t.DesiredState,
          message: t.Status?.Message,
        })),
      };
    } catch (err: any) {
      return { id: serviceId, error: err.message };
    }
  }

  /**
   * Removes a Docker Swarm service
   */
  public async removeService(serviceId: string): Promise<void> {
    if (serviceId.startsWith("mock-srv-")) {
      return;
    }

    try {
      const service = this.docker.getService(serviceId);
      await service.remove();
    } catch (err: any) {
      console.warn(`[Docker Swarm] Could not remove service ${serviceId}: ${err.message}`);
    }
  }
}

export const dockerService = new DockerService();
