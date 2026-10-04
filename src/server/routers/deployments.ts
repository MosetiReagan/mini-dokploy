import { router, protectedProcedure } from "../trpc/trpc";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../db";
import { deployments } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { dockerService } from "../services/docker.service";
import { buildService } from "../services/build.service";
import { logService } from "../services/log.service";

export const deploymentRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    // Multi-tenant isolation: strictly filter by logged-in user
    return db
      .select()
      .from(deployments)
      .where(eq(deployments.userId, ctx.user.id))
      .orderBy(desc(deployments.createdAt))
      .all();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input, ctx }) => {
      const deployment = db
        .select()
        .from(deployments)
        .where(and(eq(deployments.id, input.id), eq(deployments.userId, ctx.user.id)))
        .get();

      if (!deployment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deployment not found or access denied.",
        });
      }

      return deployment;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(2, "Name must be at least 2 characters")
          .max(40, "Name must be under 40 characters")
          .regex(/^[a-zA-Z0-9_-]+$/, "Name can only contain letters, numbers, hyphens, and underscores"),
        repoUrl: z
          .string()
          .url("Please provide a valid Git repository URL")
          .refine(
            (url) => url.startsWith("https://") || url.startsWith("http://") || url.startsWith("git@"),
            "URL must use HTTPS, HTTP, or SSH"
          ),
        dockerfilePath: z
          .string()
          .default("./Dockerfile"),
        branch: z.string().default("main"),
        exposedPort: z.number().int().min(1).max(65535).default(80),
        customLabels: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deploymentId = `dep_${crypto.randomUUID()}`;
      const subdomain = dockerService.generateSubdomain(input.name, deploymentId);
      const customLabelsJson = JSON.stringify(input.customLabels || {});

      // 1. Persist initial deployment record
      const now = new Date();
      db.insert(deployments)
        .values({
          id: deploymentId,
          userId: ctx.user.id,
          name: input.name,
          repoUrl: input.repoUrl,
          dockerfilePath: input.dockerfilePath || "./Dockerfile",
          branch: input.branch || "main",
          exposedPort: input.exposedPort || 80,
          subdomain,
          customLabelsJson,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // 2. Launch asynchronous build pipeline
      setImmediate(() => {
        buildService
          .executeBuild({
            deploymentId,
            name: input.name,
            repoUrl: input.repoUrl,
            dockerfilePath: input.dockerfilePath || "./Dockerfile",
            branch: input.branch || "main",
            exposedPort: input.exposedPort || 80,
            subdomain,
            customLabels: input.customLabels,
            isRedeploy: false,
          })
          .catch((err) => {
            console.error(`[Background Build Error] Deployment ${deploymentId}:`, err);
          });
      });

      return {
        id: deploymentId,
        name: input.name,
        subdomain,
        status: "pending",
      };
    }),

  redeploy: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const deployment = db
        .select()
        .from(deployments)
        .where(and(eq(deployments.id, input.id), eq(deployments.userId, ctx.user.id)))
        .get();

      if (!deployment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deployment not found or access denied.",
        });
      }

      let parsedLabels: Record<string, string> = {};
      try {
        parsedLabels = JSON.parse(deployment.customLabelsJson || "{}");
      } catch {}

      // Reset to pending
      db.update(deployments)
        .set({ status: "pending", errorMessage: null, updatedAt: new Date() })
        .where(eq(deployments.id, deployment.id))
        .run();

      setImmediate(() => {
        buildService
          .executeBuild({
            deploymentId: deployment.id,
            name: deployment.name,
            repoUrl: deployment.repoUrl,
            dockerfilePath: deployment.dockerfilePath,
            branch: deployment.branch,
            exposedPort: deployment.exposedPort,
            subdomain: deployment.subdomain,
            customLabels: parsedLabels,
            isRedeploy: true,
          })
          .catch((err) => {
            console.error(`[Redeploy Error] Deployment ${deployment.id}:`, err);
          });
      });

      return { success: true, id: deployment.id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const deployment = db
        .select()
        .from(deployments)
        .where(and(eq(deployments.id, input.id), eq(deployments.userId, ctx.user.id)))
        .get();

      if (!deployment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deployment not found or access denied.",
        });
      }

      // 1. Remove Docker Swarm service if active
      if (deployment.dockerServiceId) {
        await dockerService.removeService(deployment.dockerServiceId);
      }

      // 2. Remove record from database
      db.delete(deployments).where(eq(deployments.id, deployment.id)).run();

      return { success: true };
    }),

  getLogs: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const deployment = db
        .select()
        .from(deployments)
        .where(and(eq(deployments.id, input.id), eq(deployments.userId, ctx.user.id)))
        .get();

      if (!deployment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deployment not found or access denied.",
        });
      }

      return logService.getLogs(deployment.id);
    }),
});
