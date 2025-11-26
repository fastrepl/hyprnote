"use client";

import { Mermaid as MermaidBase } from "mdx-mermaid/Mermaid";

export function Mermaid({ chart }: { chart: string }) {
  return <MermaidBase chart={chart} />;
}
