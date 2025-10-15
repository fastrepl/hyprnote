import { useCallback, useEffect, useRef, useState } from "react";
import { useStores } from "tinybase/ui-react";

import { cn } from "@hypr/ui/lib/utils";
import { METRICS, type Store as PersistedStore, STORE_ID as STORE_ID_PERSISTED, UI } from "../store/tinybase/persisted";
import { type SeedDefinition, seeds } from "./seed/index";

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
  const [lastSeedId, setLastSeedId] = useState<string | null>(null);
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
    setLastSeedId(seed.id);
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
          setLastSeedId(target.id);
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
      setLastSeedId(seed.id);
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
      <DevtoolDrawer open={open} lastSeedId={lastSeedId} humansCount={humansCount} onSeed={handleSeed} />
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

function DevtoolDrawer({ open, lastSeedId, humansCount, onSeed }: {
  open: boolean;
  lastSeedId: string | null;
  humansCount: number;
  onSeed: (seed: SeedDefinition) => void;
}) {
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
        <div className="flex flex-col gap-1.5">
          {seeds.map(seed => (
            <button
              key={seed.id}
              type="button"
              className={cn([
                "w-full px-2 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors",
                "border border-white/14",
                lastSeedId === seed.id ? "bg-indigo-500/40" : "bg-white/8",
              ])}
              onClick={() => onSeed(seed)}
            >
              {seed.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1 text-[10px] opacity-80">
          <span>Rows: {humansCount} humans</span>
          {lastSeedId && <span>Last: {lastSeedId}</span>}
        </div>
      </div>
    </aside>
  );
}
