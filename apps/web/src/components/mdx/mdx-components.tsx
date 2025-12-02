import type { ComponentType } from "react";

import { Image } from "@/components/image";

import { Callout } from "./callout";
import { MDXLink } from "./link";
import { Mermaid } from "./mermaid";
import { Tweet } from "./tweet";

// MDX component props type
export type MDXComponents = {
  [key: string]: ComponentType<any>;
};

// Default MDX components shared across all MDX renderers
export const defaultMDXComponents: MDXComponents = {
  a: MDXLink,
  Image,
  img: Image,
  mermaid: Mermaid,
  Mermaid,
  Tweet,
  Callout,
};

// Create custom MDX components by merging with defaults
export function createMDXComponents(
  customComponents?: Partial<MDXComponents>,
): MDXComponents {
  return {
    ...defaultMDXComponents,
    ...(customComponents || {}),
  } as MDXComponents;
}
