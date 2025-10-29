"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function hasEvalAccess(): Promise<boolean> {
  // Optional global override for development or emergency access
  if (process.env.ALLOW_EVAL_FOR_ALL === "1") return true;

  const { userId } = await auth();
  if (!userId) return false;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const pub = (user.publicMetadata || {}) as Record<string, unknown>;
  const priv = (user.privateMetadata || {}) as Record<string, unknown>;

  const roles = new Set<string>();
  for (const src of [pub, priv]) {
    const role = (src["role"] as string | undefined)?.toLowerCase();
    if (role) roles.add(role);
    const features = src["features"] as unknown;
    if (Array.isArray(features)) {
      for (const f of features) if (typeof f === "string") roles.add(f.toLowerCase());
    }
  }

  // Supported flags:
  // - privateMetadata.allowEval === true (preferred)
  // - publicMetadata.allowEval === true (visible to client)
  // - role === 'admin'
  // - features includes 'eval'
  const allowEval = Boolean(pub["allowEval"]) || Boolean(priv["allowEval"]);
  if (allowEval) return true;
  if (roles.has("admin")) return true;
  if (roles.has("eval")) return true;
  return false;
}

export async function requireEvalAccess(): Promise<void> {
  const ok = await hasEvalAccess();
  if (!ok) throw new Error("FORBIDDEN_EVAL");
}

