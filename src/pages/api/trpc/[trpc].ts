import * as trpcNext from "@trpc/server/adapters/next";
import { appRouter } from "../../../server/trpc/root";
import { createContext } from "../../../server/trpc/context";

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext,
  onError({ error, path }) {
    console.error(`[tRPC Error] on path '${path}':`, error.message);
  },
});
