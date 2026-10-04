import { router, publicProcedure, protectedProcedure } from "../trpc/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { createSession, setSessionCookie, clearSessionCookie } from "../auth/session";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6, "Password must be at least 6 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .get();

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const userId = `usr_${crypto.randomUUID()}`;

      db.insert(users)
        .values({
          id: userId,
          email: input.email.toLowerCase(),
          passwordHash,
          role: "user",
          createdAt: new Date(),
        })
        .run();

      const token = await createSession(userId);
      setSessionCookie(ctx.res, token);

      return {
        id: userId,
        email: input.email.toLowerCase(),
        role: "user",
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .get();

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid email or password.",
        });
      }

      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid email or password.",
        });
      }

      const token = await createSession(user.id);
      setSessionCookie(ctx.res, token);

      return {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }),

  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.user) return null;
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      role: ctx.user.role,
    };
  }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.res);
    return { success: true };
  }),
});
