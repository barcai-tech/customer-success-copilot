import Link from "next/link";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="w-4 h-4" />
          <span>Conversational AI for Customer Success</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          Customer Success Copilot
        </h1>

        <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
          An agentic AI assistant that analyzes customer health, generates
          actionable insights, and produces business-ready outputs through
          natural conversation. Built with production-grade security and
          multi-tool orchestration.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button asChild size="lg" className="gap-2 text-lg px-8">
            <Link href="/copilot">
              Try the Copilot
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="gap-2 text-lg px-8"
          >
            <Link
              href="https://github.com/barcai-tech/customer-success-copilot"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-left">
          <div className="p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Conversational Interface
            </h3>
            <p className="text-sm text-muted-foreground">
              Ask questions in natural language. Get health scores, renewal
              insights, and QBR outlines instantly.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Planning</h3>
            <p className="text-sm text-muted-foreground">
              Multi-step workflows orchestrate specialized tools for usage
              analysis, ticket review, and contract details.
            </p>
          </div>

          <div className="p-6 rounded-lg border bg-card">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
            <p className="text-sm text-muted-foreground">
              HMAC-signed backend calls, server-side secrets, OWASP LLM Top 10
              compliance, and multi-tenant data isolation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
