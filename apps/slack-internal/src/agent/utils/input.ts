export type AgentInput = string | { request?: string };

export function parseRequest(input: AgentInput): string {
  return typeof input === "string" ? input : (input.request ?? "");
}
