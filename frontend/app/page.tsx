import PlannerForm from "@/src/components/PlannerForm";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Customer Success Copilot</h1>
      <PlannerForm />
      <p className="text-sm text-gray-500 mt-6">Configure BACKEND_BASE_URL and HMAC_SECRET in frontend/.env.local (server-side only).</p>
    </main>
  );
}
