import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";

const schema = z.object({
  step: z.enum(["permissions"]),
});

export const Route = createFileRoute("/onboarding/")({
  component: Component,
  validateSearch: zodValidator(schema),
});

function Component() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Onboarding</h1>
      </div>
    </div>
  );
}
