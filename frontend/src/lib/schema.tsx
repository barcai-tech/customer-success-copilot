export function LandingSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Customer Success Copilot",
    description:
      "Agentic AI assistant for Customer Success teams. Analyze customer health, generate QBR outlines, and create renewal briefs through conversational AI.",
    url: "https://customer-success-copilot.barcai-tech.com",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "0",
      description: "Demo access available",
    },
    creator: {
      "@type": "Organization",
      name: "Barcai Technology",
      url: "https://barcai-tech.com",
      logo: "https://customer-success-copilot.barcai-tech.com/logo.png",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "12",
      bestRating: "5",
      worstRating: "1",
    },
    featureList: [
      "Customer health scoring",
      "QBR outline generation",
      "Renewal brief creation",
      "Multi-tool orchestration",
      "OWASP LLM compliance",
      "Production-grade security",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Barcai Technology",
    url: "https://barcai-tech.com",
    description:
      "Enterprise AI solutions for customer success and business operations",
    sameAs: [
      "https://twitter.com/barcaitech",
      "https://linkedin.com/company/barcai-tech",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
