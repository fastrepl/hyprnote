import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";

import { commands } from "@/types/tauri";
import { ArrowUpRight, CircleCheck } from "lucide-react";

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
  const navigate = useNavigate();
  const handleNext = () => {
    if (step === "permissions") {
      navigate({ to: "/" });
    } else {
      navigate({ to: "/onboarding", search: { step: "permissions" } });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      {step === "permissions" && <Permissions handleNext={handleNext} />}
    </div>
  );
}

function Permissions({ handleNext }: { handleNext: () => void }) {
  const micPermission = useQuery({
    queryKey: ["permissions", "mic"],
    queryFn: async (): Promise<boolean> => {
      return true;
    },
    refetchInterval: 1000,
  });

  const capturePermission = useQuery({
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
    <div className="flex flex-col items-center justify-center gap-8">
      <h1 className="text-xl font-bold">
        Please allow Hyprnote to have proper access to your system
      </h1>

      <div className="flex w-full flex-col gap-2 rounded-md border py-2">
        <div className="flex flex-row items-center justify-between px-4">
          <span>Access to my voice</span>
          {micPermission.data ? (
            <CircleCheck size={16} color="green" />
          ) : (
            <button
              className="text-gray-600 hover:text-gray-900"
              onClick={handleClickMic}
            >
              <ArrowUpRight size={18} />
            </button>
          )}
        </div>
        <div className="flex flex-row items-center justify-between px-4">
          <span>Access to other people's voices</span>
          {capturePermission.data ? (
            <CircleCheck size={16} color="green" />
          ) : (
            <button
              className="text-gray-600 hover:text-gray-900"
              onClick={handleClickMic}
            >
              <ArrowUpRight size={18} />
            </button>
          )}
        </div>
      </div>

      {micPermission.data && capturePermission.data && (
        <button onClick={handleNext}>Next</button>
      )}
    </div>
  );
}
