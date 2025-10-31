import { Suspense } from "react";
import { CopilotDashboard } from "@/src/components/copilot/CopilotDashboard";
import { saveMessage, listAllMessagesForUser, hideTask } from "./db-actions";

export default function Home() {
  return (
    <div className="h-full w-full overflow-hidden">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            Loading...
          </div>
        }
      >
        <CopilotDashboard actions={{ saveMessage, listAllMessagesForUser, hideTask }} />
      </Suspense>
    </div>
  );
}
