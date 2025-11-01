// Multi-customer comparison replies (helpful guidance)
export const MULTI_CUSTOMER_REPLIES: string[] = [
  "Excellent question! You're thinking like a Customer Success Pro.\n\nThis demo looks at one customer at a time — the comparison magic lives in a full dashboard version. If that's something your team could use, nudge me — I'd be happy to explore building it with you.\n\nFor now, try something like:\n• \"What's the health score for Acme Corp?\"\n• \"Show me renewal risk for TechStart Inc\"",
  'Good thinking! Cross-customer comparisons are powerful, but this demo focuses on single-customer insights.\n\nYou can select a customer from the sidebar and ask:\n• "How healthy is [customer name]?"\n• "What\'s the churn risk for [customer name]?"',
  "I like where your head's at! Multi-customer rankings and comparisons would be part of the full analytics dashboard.\n\nFor now, try analyzing individual customers:\n• Pick a customer from the sidebar\n• Ask about their health, tickets, or renewal status",
  "Great question! The full platform would handle that kind of comparison across your portfolio.\n\nIn this demo, I can help with single-customer analysis:\n• Customer health scores\n• Renewal briefs\n• Support ticket summaries\n• QBR outlines",
  'That\'s exactly the kind of insight a CSM team needs! However, portfolio-wide comparisons require the full platform.\n\nThis demo specializes in deep-diving one customer at a time. Select a customer and ask:\n• "What\'s their adoption trend?"\n• "Show me recent support tickets"',
];

export const OUT_OF_SCOPE_REPLIES: string[] = [
  "My sneaky friend, I'm flattered — but I moonlight as a customer-management copilot, not a jailbreak concierge. Could you try a safer prompt?",
  "That prompt wandered off the map. I only have a GPS for customer-success land — re-route and I’ll guide you.",
  "I admire creative curiosity, but this smells like a trapdoor. I’ll help with customers, not plot twists.",
  "Plot twist: I refuse villainy. Give me a customer question and we’ll write a happy ending.",
  "Nice try, hacker-emoji — wrong door. I only open customer success doors. 🚪➡️",
  "Tempting, but nope. I’m on a strict ‘no-hack’ diet. Try a customer-centred request?",
  "Whoa — that took a left into sketchy-ville. I only have a map for polite, useful prompts.",
  "I can’t help with that request. I do workflows, templates and empathy — not exploits.",
  "My curiosity detector is buzzing, but my compliance engine says ‘nah.’ Reword for something safe.",
  "Those are interesting words — and also forbidden. Ask something about customer journeys instead.",
  "I appreciate a mystery, but this one has missing pieces and a rope ladder. Send a less adventurous prompt?",
  "I’m a helpful assistant, not a dramatic sidekick in a heist film. Reframe and I’ll assist.",
  "Security check: this smells funny. I’m sworn to help customers, not star in spy novels.",
  "Nice try — you’ve unlocked my ‘stern look’ response. 😏 Keep it customer-centric and I’ll smile again.",
  "My dear prompt-wanderer, you’ve strayed into forbidden woods. Return to the orchard of customers and I’ll pick you a juicy answer.",
  "That request is outside my playbook. If you’re debugging legitimately, describe the behaviour — not exploit code.",
  "This prompt hit my ‘nope’ alarm. I’ll happily help with CRM magic, analytics, and templates instead.",
  "Cute attempt. I prefer to spend my time improving customer experiences, not participating in capers.",
  "I’d love to help — but that’s out of scope. Try asking about onboarding sequences or churn reduction.",
  "Hold my coffee — oh wait, I can’t help with that. Ask me about workflows and I’m all in.",
  "That’s a creative detour, but I only hand out help for customer-facing things. New prompt?",
  "Friendly reminder: I won’t do anything unsafe. I will help you make better user journeys.",
  "I sense mischief. I’m more into delighting customers than enabling mischief-makers.",
  "If curiosity is a crime, you’re guilty — but I still can’t help with this one. Try a valid customer question.",
  "Give me a customer problem and I’ll bring solutions. Give me exploits and I’ll bring polite refusal.",
  "This looks like an ‘ask-not’ — I’ll pass, but would love to help design a customer-facing FAQ instead.",
  "I’m here for templates, best practices and friendly coaching — not for starring in hacking thrillers.",
  "Danger sniffed. I’ll redirect you to something useful: how about a retention strategy instead?",
  "Curiosity appreciated, compliance required. Rephrase into a safe, customer-focused question and we’re golden.",
  "Misuse denied, helpfulness engaged. Tell me about the customer issue and I’ll happily roll up my sleeves.",
];

export function getRandomOutOfScopeReply(): string {
  const idx = Math.floor(Math.random() * OUT_OF_SCOPE_REPLIES.length);
  return OUT_OF_SCOPE_REPLIES[idx];
}

export function getRandomMultiCustomerReply(): string {
  const idx = Math.floor(Math.random() * MULTI_CUSTOMER_REPLIES.length);
  return MULTI_CUSTOMER_REPLIES[idx];
}
