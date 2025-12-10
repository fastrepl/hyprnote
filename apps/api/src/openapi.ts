import { API_TAGS } from "./routes";

export const openAPIDocumentation = {
  openapi: "3.1.0",
  info: {
    title: "Hyprnote API",
    version: "1.0.0",
    description:
      "API for Hyprnote - AI-powered meeting notes application. APIs are categorized by tags: 'internal' for health checks and internal use, 'app' for endpoints used by the Hyprnote application (requires authentication), and 'webhook' for external service callbacks.",
  },
  tags: [
    {
      name: API_TAGS.INTERNAL,
      description: "Internal endpoints for health checks and monitoring",
    },
    {
      name: API_TAGS.APP,
      description:
        "Endpoints used by the Hyprnote application. Requires Supabase authentication.",
    },
    {
      name: API_TAGS.WEBHOOK,
      description: "Webhook endpoints for external service callbacks",
    },
  ],
  components: {
    securitySchemes: {
      Bearer: {
        type: "http" as const,
        scheme: "bearer",
        description: "Supabase JWT token",
      },
    },
  },
  servers: [
    {
      url: "https://api.hyprnote.com",
      description: "Production server",
    },
    {
      url: "http://localhost:4000",
      description: "Local development server",
    },
  ],
};
