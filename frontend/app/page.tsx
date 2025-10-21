import { runPlanner } from "@/src/agent/planner";

export default function Home() {
  async function action(formData: FormData) {
    "use server";
    const customerId = String(formData.get("customerId") || "").trim();
    if (!customerId) return { error: "customerId required" } as const;
    try {
      const result = await runPlanner(customerId);
      return { ok: true, result } as const;
    } catch (e) {
      return { error: (e as Error).message } as const;
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Customer Success Copilot</h1>
      <form action={action} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Customer ID</label>
          <input name="customerId" placeholder="acme-001" className="border px-3 py-2 rounded w-full" />
        </div>
        <button className="bg-black text-white px-4 py-2 rounded">Run Planner</button>
      </form>
      <p className="text-sm text-gray-500 mt-6">Configure BACKEND_BASE_URL and HMAC_SECRET in frontend/.env.local (server-side only).</p>
    </main>
  );
}

