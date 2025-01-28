import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleCheck } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { commands } from "@/types/tauri.gen";

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
    <div className="flex flex-col gap-2">
      <h1 className="mb-12 text-xl font-bold">
        Please allow Hyprnote to have proper access to your system
      </h1>

      <h2 className="text-xs font-semibold">Required</h2>
      <div className="flex w-full flex-col gap-2 rounded-md border py-2">
        <PermissionItem
          label="Access to your voice"
          done={micPermission.data}
          handleClick={handleClickMic}
        />
        <PermissionItem
          label="Access to other people's voices"
          done={capturePermission.data}
          handleClick={handleClickMic}
        />
      </div>

      <div className="my-4" />

      <h2 className="text-xs font-semibold">Optional</h2>
      <div className="flex w-full flex-col gap-2 rounded-md border py-2">
        <PermissionItem
          label="Access to Apple calendar"
          done={capturePermission.data}
          handleClick={handleClickMic}
        />
        <PermissionItem
          label="Access to Apple contacts"
          done={capturePermission.data}
          handleClick={handleClickMic}
        />
      </div>

      <div className="my-4" />

      {micPermission.data && capturePermission.data && (
        <Button variant="default" onClick={handleNext}>
          Next
        </Button>
      )}
    </div>
  );
}

interface PermissionItemProps {
  label: string;
  done: boolean | undefined;
  handleClick: () => void;
}

function PermissionItem({ label, done, handleClick }: PermissionItemProps) {
  return (
    <div className="flex flex-row items-center justify-between px-4">
      <span>{label}</span>
      {done ? (
        <CircleCheck size={16} color="green" />
      ) : (
        <button
          className="text-gray-600 hover:text-gray-900"
          onClick={handleClick}
        >
          <ArrowUpRight size={18} />
        </button>
      )}
    </div>
  );
}
