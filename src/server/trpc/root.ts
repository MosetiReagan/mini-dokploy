import { router } from "./trpc";
import { authRouter } from "../routers/auth";
import { deploymentRouter } from "../routers/deployments";

export const appRouter = router({
  auth: authRouter,
  deployments: deploymentRouter,
});

export type AppRouter = typeof appRouter;
