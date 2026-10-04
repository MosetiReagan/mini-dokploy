import { httpBatchLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import type { AppRouter } from "../server/trpc/root";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    // In browser, use relative URL
    return "";
  }
  // On server, use local port
  return `http://localhost:${process.env.PORT || 3000}`;
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
      queryClientConfig: {
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      },
    };
  },
  ssr: false,
});
