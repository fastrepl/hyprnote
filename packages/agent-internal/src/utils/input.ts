export interface ImageContent {
  base64: string;
  mimeType: string;
}

export interface AgentInput {
  request: string;
  images?: ImageContent[];
}

export function parseRequest(input: AgentInput): string {
  return input.request;
}

export function getImages(input: AgentInput): ImageContent[] {
  return input.images ?? [];
}
