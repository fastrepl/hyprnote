import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStores } from "tinybase/ui-react";

import { cn } from "@hypr/ui/lib/utils";
import { METRICS, type Store as PersistedStore, STORE_ID as STORE_ID_PERSISTED, UI } from "../store/tinybase/persisted";
import { SeedDefinition, seeds } from "./seed/index";

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
  const autoSeedRef = useRef(false);

  const stores = useStores();
  const persistedStore = stores[STORE_ID_PERSISTED] as unknown as PersistedStore | undefined;
  const humansCount = UI.useMetric(METRICS.totalHumans, STORE_ID_PERSISTED) || 0;

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    if (!persistedStore) {
      return;
    }
    if (humansCount > 0) {
      autoSeedRef.current = false;
      return;
    }
    if (autoSeedRef.current) {
      return;
    }
    const seed = seeds[0];
    if (!seed) {
      return;
    }
    autoSeedRef.current = true;
    seed.run(persistedStore);
  }, [humansCount, persistedStore]);

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

  const handleSeed = useCallback(
    (seed: SeedDefinition) => {
      if (!persistedStore) {
        return;
      }
      seed.run(persistedStore);
    },
    [persistedStore],
  );

  if (!import.meta.env.DEV) {
    return null;
  }

  if (!persistedStore) {
    return null;
  }

  return (
    <>
      <DevtoolTrigger open={open} onToggle={handleToggle} />
      <DevtoolDrawer open={open} onSeed={handleSeed} />
    </>
  );
}

function DevtoolTrigger({ open, onToggle }: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={cn([
        "fixed right-6 bottom-1 z-[2147483001]",
        "w-8 h-8 rounded-md",
        "bg-[#121214]/90 border border-white/16",
        "text-[#f5f5f5] text-[11px] font-semibold",
        "flex items-center justify-center",
        "cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
      ])}
      onClick={onToggle}
    >
      {open ? "×" : "Dev"}
    </button>
  );
}

function DevtoolDrawer({ open, onSeed }: { open: boolean; onSeed: (seed: SeedDefinition) => void }) {
  return (
    <aside
      className={cn([
        "fixed top-0 right-0 h-full w-[240px] z-[2147483000] font-sans transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      ])}
    >
      <div
        className={cn([
          "h-full p-4 flex flex-col gap-4",
          "bg-[#121214]/95 backdrop-blur-xl",
          "border-l border-white/12",
          "shadow-[-8px_0_32px_rgba(0,0,0,0.35)]",
          "text-[#f5f5f5]",
        ])}
      >
        <div className="flex justify-between items-center text-sm font-semibold">
          <span>Hyprnote Devtool</span>
        </div>
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
  return (
    <DevtoolSection title="Navigation">
      <nav className="flex flex-col gap-2 pl-2 text-sm">
        <Link to="/app/onboarding" className="hover:underline">Onboarding</Link>
        <Link to="/app/main" className="hover:underline">Main</Link>
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
