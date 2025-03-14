import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

import { HyprProvider } from "@/contexts";

import { registerTemplates } from "@/templates";

export const Route = createFileRoute("/app")({
  component: Component,
});

function Component() {
  useEffect(() => {
    registerTemplates();
    initExtensions();
  }, []);

  return (
    <HyprProvider>
      <Outlet />
    </HyprProvider>
  );
}

import DinoGameExtension from "@hypr/extension-dino-game";
import SummaryExtension from "@hypr/extension-summary";
import TranscriptExtension from "@hypr/extension-transcript";

function initExtensions() {
  [
    ...Object.values(SummaryExtension),
    ...Object.values(TranscriptExtension),
    ...Object.values(DinoGameExtension),
  ].forEach((group) => {
    group.items.forEach((item) => {
      item.init();
    });
  });
}
