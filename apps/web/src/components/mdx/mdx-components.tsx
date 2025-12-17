import type { ComponentType } from "react";

import { Image } from "@/components/image";

import { Callout } from "./callout";
import { CodeBlock } from "./code-block";
import { MDXLink } from "./link";
import { Mermaid } from "./mermaid";
import { Tweet } from "./tweet";

export type MDXComponents = {
  [key: string]: ComponentType<any>;
};

export const defaultMDXComponents: MDXComponents = {
  a: MDXLink,
  Callout,
  Image,
  img: Image,
  mermaid: Mermaid,
  Mermaid,
  pre: CodeBlock,
  Tweet,
};

export function createMDXComponents(
  customComponents?: Partial<MDXComponents>,
): MDXComponents {
  return {
    ...defaultMDXComponents,
    ...(customComponents || {}),
  } as MDXComponents;
}
