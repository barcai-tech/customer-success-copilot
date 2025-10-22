import type { ToolName } from "@/src/agent/invokeTool";

// Minimal function schemas for OpenAI tool calling
// All tools follow our standard envelope: { customerId: string, params?: object }

type JsonSchema = Record<string, unknown>;

export interface ToolDefinition {
  type: "function";
  function: {
    name: ToolName;
    description: string;
    parameters: JsonSchema;
  };
}

const envelopeParams: JsonSchema = {
  type: "object",
  properties: {
    customerId: { type: "string", description: "The target customer ID" },
    params: { type: "object", description: "Optional tool-specific params" },
  },
  required: ["customerId"],
  additionalProperties: true,
};

export function getToolRegistry(): ToolDefinition[] {
  const tools: Array<[ToolName, string]> = [
    ["get_customer_usage", "Get 30-day usage metrics and trend for a customer"],
    ["get_recent_tickets", "Get recent tickets and open ticket count"],
    ["get_contract_info", "Get contract details including ARR and renewal date"],
    ["calculate_health", "Compute customer health score and risk level"],
    ["generate_email", "Draft an email tailored to current account status"],
    ["generate_qbr_outline", "Generate a QBR outline based on current data"],
  ];

  return tools.map(([name, description]) => ({
    type: "function",
    function: {
      name,
      description,
      parameters: envelopeParams,
    },
  }));
}
