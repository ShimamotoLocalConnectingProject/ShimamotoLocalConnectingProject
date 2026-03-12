import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // User is attached by authenticateToken middleware
  const user = (opts.req as any).user || null;

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
