import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getUserFromSession, parseCookies, SESSION_COOKIE_NAME } from "../auth/session";
import type { User } from "../db/schema";
import type { IncomingMessage, ServerResponse } from "http";

export interface Context {
  req: IncomingMessage;
  res: ServerResponse;
  user: User | null;
}

export async function createContext(opts: CreateNextContextOptions): Promise<Context> {
  const { req, res } = opts;
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  const user = await getUserFromSession(token);

  return {
    req,
    res,
    user,
  };
}
