import { EvalDashboard } from "@/src/components/eval/EvalDashboard";

export default function EvalPage() {
  return (
    <div className="bg-background h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold">Evaluation Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Test quick actions across customers and capture detailed results
          </p>
        </div>
        <EvalDashboard />
      </div>
    </div>
  );
}
