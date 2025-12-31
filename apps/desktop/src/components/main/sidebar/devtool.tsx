import { useCallback, useEffect, useState } from "react";
import { useStores } from "tinybase/ui-react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { cn } from "@hypr/utils";

import {
  type Store as MainStore,
  STORE_ID as STORE_ID_PERSISTED,
} from "../../../store/tinybase/store/main";
import { type SeedDefinition, seeds } from "../../devtool/seed/index";

declare global {
  interface Window {
    __dev?: {
      seed: (id?: string) => void;
      seeds: Array<{ id: string; label: string }>;
    };
  }
}

export function DevtoolView() {
  const stores = useStores();
  const persistedStore = stores[STORE_ID_PERSISTED] as unknown as
    | MainStore
    | undefined;
  const [fixtureKey, setFixtureKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!persistedStore) {
      return;
    }

    const api = {
      seed: (id?: string) => {
        const target = id ? seeds.find((item) => item.id === id) : seeds[0];
        if (target) {
          target.run(persistedStore);
        }
      },
      seeds: seeds.map(({ id, label }) => ({ id, label })),
    };
    window.__dev = api;
    return () => {
      if (window.__dev === api) {
        delete window.__dev;
      }
    };
  }, [persistedStore]);

  const handleSeed = useCallback(
    async (seed: SeedDefinition) => {
      if (!persistedStore) {
        return;
      }
      seed.run(persistedStore);

      if ("resetFixture" in appleCalendarCommands) {
        await (appleCalendarCommands as any).resetFixture();
        setFixtureKey((k) => k + 1);
      }
    },
    [persistedStore],
  );

  if (!persistedStore) {
    return null;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-1 py-2 flex flex-col gap-2">
        <NavigationCard />
        <SeedCard onSeed={handleSeed} />
        <CalendarMockCard key={fixtureKey} />
      </div>
    </div>
  );
}

function DevtoolCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn([
        "rounded-lg border border-neutral-200 bg-white",
        "shadow-sm",
        "overflow-hidden",
      ])}
    >
      <div className="px-2 py-1.5 border-b border-neutral-100 bg-neutral-50">
        <h2 className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

interface FixtureInfo {
  current_step: number;
  max_steps: number;
  step_name: string;
}

function CalendarMockCard() {
  const [fixtureInfo, setFixtureInfo] = useState<FixtureInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadFixtureInfo = async () => {
      if (!("getFixtureInfo" in appleCalendarCommands)) {
        return;
      }
      try {
        const info = await (appleCalendarCommands as any).getFixtureInfo();
        setFixtureInfo(info);
      } catch {
        setFixtureInfo(null);
      }
    };
    loadFixtureInfo();
  }, []);

  const handleAdvance = useCallback(async () => {
    if (!("advanceFixture" in appleCalendarCommands)) return;
    setIsLoading(true);
    try {
      const info = await (appleCalendarCommands as any).advanceFixture();
      setFixtureInfo(info);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (fixtureInfo === null) {
    return null;
  }

  const isAtEnd = fixtureInfo.current_step >= fixtureInfo.max_steps - 1;

  return (
    <DevtoolCard title="Calendar Mock">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-neutral-500">
            Step {fixtureInfo.current_step + 1} of {fixtureInfo.max_steps}
          </span>
          <span className="text-xs font-medium text-neutral-700">
            {fixtureInfo.step_name}
          </span>
        </div>
        <button
          type="button"
          onClick={handleAdvance}
          disabled={isLoading || isAtEnd}
          className={cn([
            "w-full px-2 py-1.5 rounded-md",
            "text-xs font-medium",
            "border transition-colors",
            isAtEnd
              ? ["border-neutral-100 text-neutral-300", "cursor-default"]
              : [
                  "border-blue-200 bg-blue-50 text-blue-700",
                  "hover:bg-blue-100 hover:border-blue-300",
                  "cursor-pointer",
                ],
            isLoading && "opacity-50 cursor-wait",
          ])}
        >
          Advance
        </button>
      </div>
    </DevtoolCard>
  );
}

function SeedCard({ onSeed }: { onSeed: (seed: SeedDefinition) => void }) {
  return (
    <DevtoolCard title="Seeds">
      <div className="flex flex-col gap-1.5">
        {seeds.map((seed) => (
          <button
            key={seed.id}
            type="button"
            onClick={() => onSeed(seed)}
            className={cn([
              "w-full px-2 py-1.5 rounded-md",
              "text-xs font-medium text-left",
              "border border-neutral-200 text-neutral-700",
              "cursor-pointer transition-colors",
              "hover:bg-neutral-50 hover:border-neutral-300",
            ])}
          >
            {seed.label}
          </button>
        ))}
      </div>
    </DevtoolCard>
  );
}

function NavigationCard() {
  const handleShowMain = useCallback(() => {
    void windowsCommands.windowShow({ type: "main" });
  }, []);

  const handleShowOnboarding = useCallback(() => {
    void windowsCommands.windowShow({ type: "onboarding" }).then(() => {
      void windowsCommands.windowEmitNavigate(
        { type: "onboarding" },
        { path: "/app/onboarding", search: {} },
      );
    });
  }, []);

  return (
    <DevtoolCard title="Navigation">
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleShowOnboarding}
          className={cn([
            "w-full px-2.5 py-1.5 rounded-md",
            "text-xs font-medium text-left",
            "border border-neutral-200 text-neutral-700",
            "cursor-pointer transition-colors",
            "hover:bg-neutral-50 hover:border-neutral-300",
          ])}
        >
          Onboarding
        </button>
        <button
          type="button"
          onClick={handleShowMain}
          className={cn([
            "w-full px-2.5 py-1.5 rounded-md",
            "text-xs font-medium text-left",
            "border border-neutral-200 text-neutral-700",
            "cursor-pointer transition-colors",
            "hover:bg-neutral-50 hover:border-neutral-300",
          ])}
        >
          Main
        </button>
      </div>
    </DevtoolCard>
  );
}
