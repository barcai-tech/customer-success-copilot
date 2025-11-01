export function TechStack() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Tech Stack</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built with modern, production-ready technologies
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-lg border bg-card">
            <h3 className="text-2xl font-semibold mb-6">Frontend</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Next.js 16</strong> with
                  App Router & Turbopack
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">React 19</strong> with
                  Server Components
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">TypeScript</strong> for
                  type safety
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Tailwind CSS</strong> +
                  shadcn/ui components
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Zustand</strong> for state
                  management
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Clerk</strong> for
                  authentication
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Vercel</strong> deployment
                  & analytics
                </span>
              </li>
            </ul>
          </div>

          <div className="p-8 rounded-lg border bg-card">
            <h3 className="text-2xl font-semibold mb-6">Backend</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">AWS Lambda</strong>{" "}
                  serverless compute
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">API Gateway</strong> with
                  CORS & throttling
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Python 3.12</strong> with
                  pg8000
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Neon PostgreSQL</strong>{" "}
                  serverless database
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Drizzle ORM</strong> with
                  migrations
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">OpenAI GPT-4.1</strong>{" "}
                  for AI planning
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Zod</strong> for schema
                  validation
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a
            href="https://github.com/barcai-tech/customer-success-copilot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-lg"
          >
            View Technical Documentation on GitHub
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
