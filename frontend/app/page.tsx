import { CopilotDashboard } from "@/src/components/copilot/CopilotDashboard";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <CopilotDashboard />
    </div>
  );
}
