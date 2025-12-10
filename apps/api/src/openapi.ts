import { API_TAGS } from "./routes";

export const openAPIDocumentation = {
  openapi: "3.1.0",
  info: {
    title: "Hyprnote API",
    version: "1.0.0",
  },
  tags: [{ name: API_TAGS.PRIVATE }, { name: API_TAGS.PUBLIC }],
  components: {
    securitySchemes: {
      Bearer: {
        type: "http" as const,
        scheme: "bearer",
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
