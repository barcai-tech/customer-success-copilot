import { Suspense } from "react";
import { CopilotDashboard } from "@/src/components/copilot/CopilotDashboard";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { saveMessage, listAllMessagesForUser, hideTask } from "../db-actions";

export default function CopilotPage() {
  return (
    <div className="h-full w-full overflow-hidden">
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              Loading...
            </div>
          }
        >
          <CopilotDashboard
            actions={{ saveMessage, listAllMessagesForUser, hideTask }}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
