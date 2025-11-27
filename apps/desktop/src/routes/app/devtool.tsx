import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { useStores } from "tinybase/ui-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { cn } from "@hypr/utils";

import {
  type SeedDefinition,
  seeds,
} from "../../components/devtool/seed/index";
import { TinyTickMonitor } from "../../components/devtool/tinytick";
import {
  type Store as PersistedStore,
  STORE_ID as STORE_ID_PERSISTED,
} from "../../store/tinybase/main";

export const Route = createFileRoute("/app/devtool")({
  component: Component,
});

declare global {
  interface Window {
    __dev?: {
      seed: (id?: string) => void;
      seeds: Array<{ id: string; label: string }>;
    };
  }
}

function Component() {
  const stores = useStores();
  const persistedStore = stores[STORE_ID_PERSISTED] as unknown as
    | PersistedStore
    | undefined;

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
    (seed: SeedDefinition) => {
      if (!persistedStore) {
        return;
      }
      seed.run(persistedStore);
    },
    [persistedStore],
  );

  if (!persistedStore) {
    return null;
  }

  return (
    <div
      className={cn([
        "h-full w-full flex flex-col",
        "bg-[#121214] text-[#f5f5f5]",
      ])}
    >
      <header
        data-tauri-drag-region
        className={cn([
          "flex flex-row shrink-0",
          "w-full items-center h-9",
          "pl-[72px]",
        ])}
      >
        <div className="flex-1 flex justify-center" data-tauri-drag-region>
          <span
            data-tauri-drag-region
            className="text-sm font-semibold select-none cursor-default pr-12"
          >
            Devtool
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <TinyTickMonitor />
        <SeedList onSeed={handleSeed} />
        <NavigationList />
      </div>
    </div>
  );
}

function DevtoolSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function NavigationList() {
  const handleShowMain = useCallback(() => {
    windowsCommands.windowShow({ type: "main" });
  }, []);

  const handleShowOnboarding = useCallback(() => {
    windowsCommands.windowShow({ type: "onboarding" }).then(() => {
      windowsCommands.windowEmitNavigate(
        { type: "onboarding" },
        { path: "/app/onboarding", search: {} },
      );
    });
  }, []);

  return (
    <DevtoolSection title="Navigation">
      <nav className="flex flex-col gap-2 text-sm">
        <button
          type="button"
          onClick={handleShowOnboarding}
          className="pl-2 text-left hover:underline"
        >
          Onboarding
        </button>
        <button
          type="button"
          onClick={handleShowMain}
          className="pl-2 text-left hover:underline"
        >
          Main
        </button>
      </nav>
    </DevtoolSection>
  );
}

function SeedList({ onSeed }: { onSeed: (seed: SeedDefinition) => void }) {
  return (
    <DevtoolSection title="Seeds">
      <div className="flex flex-col gap-1.5">
        {seeds.map((seed) => (
          <SeedButton key={seed.id} seed={seed} onClick={() => onSeed(seed)} />
        ))}
      </div>
    </DevtoolSection>
  );
}

function SeedButton({
  seed,
  onClick,
}: {
  seed: SeedDefinition;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn([
        "w-full px-2 py-1.5 rounded-md",
        "text-[11px] font-medium",
        "border border-white/14",
        "cursor-pointer transition-colors",
      ])}
    >
      {seed.label}
    </button>
  );
}
