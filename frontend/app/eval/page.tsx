import { EvalDashboard } from "@/src/components/eval/EvalDashboard";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { listAllUsers, getCustomersForUser } from "./actions";
import { requireEvalAccess } from "@/src/lib/authz";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function EvalPage() {
  try {
    await requireEvalAccess();
  } catch {
    // Non-admins or users without explicit allowEval → redirect back where they came from
    const hdrs = await headers();
    const referer = hdrs.get("referer") || hdrs.get("referrer");
    let target = "/dashboard";
    if (referer) {
      try {
        const refUrl = new URL(referer);
        // Only allow same-host redirects and avoid redirecting back to /eval
        const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "";
        if (refUrl.host === host && refUrl.pathname !== "/eval") {
          target = `${refUrl.pathname}${refUrl.search}` || "/dashboard";
        }
      } catch {
        // ignore parse errors, fall back to /dashboard
      }
    }
    redirect(target);
  }
  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold">Evaluation Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Test quick actions across customers and capture detailed results
          </p>
        </div>
        {/*
          Pass server action references into the client component so the route
          mounts the actions endpoint at /eval, avoiding 404 on POST /eval.
        */}
        <ErrorBoundary>
          <EvalDashboard
            actions={{
              listAllUsers,
              getCustomersForUser,
            }}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
