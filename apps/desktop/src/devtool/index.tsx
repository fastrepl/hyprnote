import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useStores } from "tinybase/ui-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { cn } from "@hypr/utils";
import { useAutoCloser } from "../hooks/useAutoCloser";
import { type Store as PersistedStore, STORE_ID as STORE_ID_PERSISTED } from "../store/tinybase/persisted";
import { SeedDefinition, seeds } from "./seed/index";
import { TinyTickMonitor } from "./tinytick";

declare global {
  interface Window {
    __dev?: {
      seed: (id?: string) => void;
      seeds: Array<{ id: string; label: string }>;
    };
  }
}

export function Devtool() {
  const [open, setOpen] = useState(false);

  const stores = useStores();
  const persistedStore = stores[STORE_ID_PERSISTED] as unknown as PersistedStore | undefined;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!persistedStore) {
      return;
    }

    const api = {
      seed: (id?: string) => {
        const target = id ? seeds.find(item => item.id === id) : seeds[0];
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

  const handleToggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

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
    <>
      {!open && <DevtoolTrigger onToggle={handleToggle} />}
      <DevtoolDrawer open={open} onClose={handleClose} onSeed={handleSeed} />
    </>
  );
}

function DevtoolTrigger({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      type="button"
      className={cn([
        "fixed right-16 bottom-2 z-[2147483001]",
        "w-8 h-8 rounded-md",
        "bg-[#121214]/90 border border-white/16",
        "text-[#f5f5f5] text-[11px] font-semibold",
        "flex items-center justify-center",
        "cursor-pointer",
      ])}
      onClick={onToggle}
    >
      Dev
    </button>
  );
}

function DevtoolDrawer(
  {
    open,
    onClose,
    onSeed,
  }: {
    open: boolean;
    onClose: () => void;
    onSeed: (seed: SeedDefinition) => void;
  },
) {
  const ref = useAutoCloser(onClose, { esc: true, outside: true });

  return (
    <aside
      className={cn([
        "fixed top-0 right-0 h-full w-[240px] z-[2147483000] font-sans transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      ])}
    >
      <div
        ref={ref}
        className={cn([
          "h-full p-4 flex flex-col gap-4",
          "bg-[#121214]/95 backdrop-blur-xl",
          "border-l border-white/12",
          "text-[#f5f5f5]",
        ])}
      >
        <div className="flex justify-between items-center text-sm font-semibold">
          <span>Hyprnote Devtool</span>
        </div>
        <TinyTickMonitor />
        <SeedList onSeed={onSeed} />
        <NavigationList />
      </div>
    </aside>
  );
}

function DevtoolSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function NavigationList() {
  const navigate = useNavigate();

  const handleShowMain = useCallback(() => {
    windowsCommands.windowShow({ type: "main" });
  }, [navigate]);

  const handleShowOnboarding = useCallback(() => {
    windowsCommands.windowShow({ type: "onboarding" }).then(() => {
      windowsCommands.windowEmitNavigate({ type: "onboarding" }, { path: "/app/onboarding", search: {} });
    });
  }, [navigate]);

  return (
    <DevtoolSection title="Navigation">
      <nav className="flex flex-col gap-2 text-sm">
        <button onClick={handleShowOnboarding} className="pl-2 text-left hover:underline">Onboarding</button>
        <button onClick={handleShowMain} className="pl-2 text-left hover:underline">Main</button>
      </nav>
    </DevtoolSection>
  );
}

function SeedList({ onSeed }: { onSeed: (seed: SeedDefinition) => void }) {
  return (
    <DevtoolSection title="Seeds">
      <div className="flex flex-col gap-1.5">
        {seeds.map(seed => <SeedButton key={seed.id} seed={seed} onClick={() => onSeed(seed)} />)}
      </div>
    </DevtoolSection>
  );
}

function SeedButton({ seed, onClick }: { seed: SeedDefinition; onClick: () => void }) {
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
