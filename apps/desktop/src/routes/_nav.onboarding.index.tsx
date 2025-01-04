import { z } from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { commands } from "@/types/tauri";

const STEPS = ["permissions"] as const;

const schema = z.object({
  step: z.enum(STEPS).default(STEPS[0]),
});

export const Route = createFileRoute("/_nav/onboarding/")({
  component: Component,
  validateSearch: zodValidator(schema),
});

function Component() {
  const { step } = Route.useSearch();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      {step === "permissions" && <Permissions />}
    </div>
  );
}

function Permissions() {
  const _micPermission = useQuery({
    queryKey: ["permissions", "mic"],
    queryFn: async (): Promise<boolean> => {
      return true;
    },
    refetchInterval: 1000,
  });

  const _capturePermission = useQuery({
    queryKey: ["permissions", "capture"],
    queryFn: async (): Promise<boolean> => {
      return true;
    },
    refetchInterval: 1000,
  });

  const handleClickMic = () => {
    commands.openPermissionSettings("microphone");
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <h1>Permissions</h1>

      <div className="flex flex-col">
        <div className="flex flex-row items-center justify-between">
          <span>Access to my voice</span>
          <button onClick={handleClickMic}>Allow</button>
        </div>
        <div className="flex flex-row items-center justify-between">
          <span>Access to other people's voices</span>
          <button>Allow</button>
        </div>
      </div>

      <button>Next</button>
    </div>
  );
}
