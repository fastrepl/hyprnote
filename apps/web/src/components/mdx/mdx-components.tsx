import type { ComponentType } from "react";

import { Image } from "@/components/image";

import { Callout } from "./callout";
import { MDXLink } from "./link";
import { Mermaid } from "./mermaid";
import { Tweet } from "./tweet";

export type MDXComponents = {
  [key: string]: ComponentType<any>;
};

export const defaultMDXComponents: MDXComponents = {
  a: MDXLink,
  Image,
  img: Image,
  mermaid: Mermaid,
  Mermaid,
  Tweet,
  Callout,
};

export function createMDXComponents(
  customComponents?: Partial<MDXComponents>,
): MDXComponents {
  return {
    ...defaultMDXComponents,
    ...(customComponents || {}),
  } as MDXComponents;
}
