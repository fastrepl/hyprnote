import { createFileRoute } from "@tanstack/react-router";

import { createVSRoute } from "@/components/vs-template";

export const Route = createFileRoute("/_view/vs/circleback")(
  createVSRoute("circleback"),
);
