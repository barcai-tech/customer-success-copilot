import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  // Public routes can be browsed without auth. Protect others via server actions.
  publicRoutes: ["/", "/api/copilot/stream", "/api/db/health", "/api/db/seed-global"],
});

export const config = {
  matcher: [
    // Run for all paths except static files and Next internals
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/(api|trpc)(.*)",
  ],
};
