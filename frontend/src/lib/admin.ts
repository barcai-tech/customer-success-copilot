import { currentUser } from "@clerk/nextjs/server";

export async function isUserAdmin(): Promise<boolean> {
  const user = await currentUser();
  return user?.privateMetadata?.role === "admin";
}
