import { z } from "zod";

// https://vitepress.dev/reference/frontmatter-config
const vitepressFrontmatterSchema = z.object({
  title: z.string().optional(),
  titleTemplate: z.union([z.string(), z.boolean()]).optional(),
  description: z.string().optional(),
  head: z
    .array(
      z.tuple([
        z.string(),
        z.record(z.string(), z.string()),
        z.string().optional(),
      ]),
    )
    .optional(),
  layout: z.enum(["doc", "home", "page"]).optional().default("doc"),
  navbar: z.boolean().optional().default(true),
  sidebar: z.boolean().optional().default(true),
  aside: z
    .union([z.boolean(), z.literal("left")])
    .optional()
    .default(true),
  outline: z
    .union([
      z.number(),
      z.tuple([z.number(), z.number()]),
      z.literal("deep"),
      z.boolean(),
    ])
    .optional()
    .default(2),
  lastUpdated: z.union([z.boolean(), z.date()]).optional().default(true),
  editLink: z.boolean().optional().default(true),
  footer: z.boolean().optional().default(true),
  pageClass: z.string().optional(),
});

export const pluginFrontmatterSchema = z
  .object({
    id: z.string(),
  })
  .extend(vitepressFrontmatterSchema.shape);

export type PluginFrontmatter = z.infer<typeof pluginFrontmatterSchema>;
