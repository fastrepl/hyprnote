import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";

const STEPS = ["permissions"] as const;

const schema = z.object({
  step: z.enum(STEPS).default(STEPS[0]),
});

export const Route = createFileRoute("/onboarding/")({
  component: Component,
  validateSearch: zodValidator(schema),
});

function Component() {
  const { step } = Route.useSearch();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {step === "permissions" && <Permissions />}
    </div>
  );
}

function Permissions() {
  const { status, data, error, isFetching } = useQuery({
    queryKey: ["onboarding", "permissions"],
    queryFn: async (): Promise<boolean> => {
      return true;
    },
    refetchInterval: 1000,
  });

  return <div>Permissions</div>;
}
