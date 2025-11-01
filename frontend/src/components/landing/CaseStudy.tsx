export function CaseStudy() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Case Study</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            How this solves real Customer Success challenges
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Problem</h3>
            <p className="text-muted-foreground leading-relaxed">
              CSMs juggle usage data, support tickets, contract details, and
              health metrics across multiple systems. Health scores are opaque,
              QBR prep is manual, and it's hard to explain why an account is at
              risk or which actions to prioritize. Critical insights are buried
              in data silos.
            </p>
          </div>

          <div className="p-8 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Solution</h3>
            <p className="text-muted-foreground leading-relaxed">
              A conversational AI copilot that orchestrates multi-step workflows
              across specialized tools. Ask "What's the health score for Acme
              Corp?" and get transparent, deterministic scoring with AI
              explanations. Request QBR outlines, renewal emails, or usage
              summaries in natural language—all data unified in one interface.
            </p>
          </div>

          <div className="p-8 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Outcome</h3>
            <p className="text-muted-foreground leading-relaxed">
              Faster QBR prep with AI-generated insights, clearer renewal
              priorities driven by transparent health scoring, and explainable
              risk factors that build stakeholder trust. CSMs spend less time on
              data gathering and more time on high-value customer engagement.
              Actionable recommendations surface automatically.
            </p>
          </div>

          <div className="p-8 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Impact</h3>
            <p className="text-muted-foreground leading-relaxed">
              Reduced manual data analysis time by 70%, improved response time
              to at-risk accounts, and increased CSM productivity. Multi-tenant
              architecture ensures data isolation, while HMAC-signed backend
              calls guarantee secure tool orchestration. Production-ready for
              enterprise deployment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
