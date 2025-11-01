import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export function CallToAction() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          Ready to explore the Copilot?
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Try asking about customer health scores, generating QBR outlines, or
          drafting renewal emails. See how conversational AI can transform
          Customer Success workflows.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
              View Source Code
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Built by{" "}
          <a
            href="https://barcai-tech.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Barcai Technology
          </a>
          . Open source and production-ready.
        </p>
      </div>
    </section>
  );
}
