import z from "zod";

const schema = z.object({
  VITE_BASE_URL: z.string().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().email().default("yujonglee@hyprnote.com"),
  ORG_SLUG: z.string().default("hyprnote"),
  TELEMETRY: z.coerce.boolean().default(true),
});

export const envServerSchema = schema.parse({
  VITE_BASE_URL: process.env.VITE_BASE_URL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ORG_SLUG: process.env.ORG_SLUG,
  TELEMETRY: process.env.TELEMETRY,
});

export const envServerKeys = Object.keys(schema.shape) as [
  keyof typeof envServerSchema,
  ...(keyof typeof envServerSchema)[],
];
