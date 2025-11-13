import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useStores } from "tinybase/ui-react";

import { commands as windowsCommands } from "@hypr/plugin-windows";
import { cn } from "@hypr/utils";

import { useAutoCloser } from "../hooks/useAutoCloser";
import {
  type Store as PersistedStore,
  STORE_ID as STORE_ID_PERSISTED,
} from "../store/tinybase/main";
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
  const [triggerPosition, setTriggerPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth - 96 : 0,
    y: typeof window !== "undefined" ? window.innerHeight - 40 : 0,
  });

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

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
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
      {!open && (
        <DevtoolTrigger
          onToggle={handleToggle}
          position={triggerPosition}
          onPositionChange={setTriggerPosition}
        />
      )}
      <DevtoolDrawer open={open} onClose={handleClose} onSeed={handleSeed} />
    </>
  );
}

function DevtoolTrigger({
  onToggle,
  position,
  onPositionChange,
}: {
  onToggle: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      setIsDragging(true);
      setHasDragged(false);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    },
    [position],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setHasDragged(true);
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Constrain to viewport
      const maxX = window.innerWidth - 32; // 32px is button width
      const maxY = window.innerHeight - 32; // 32px is button height

      onPositionChange({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, onPositionChange]);

  const handleClick = useCallback(() => {
    if (!hasDragged) {
      onToggle();
    }
  }, [hasDragged, onToggle]);

  return (
    <button
      type="button"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={cn([
        "fixed z-2147483001",
        "w-8 h-8 rounded-md",
        "bg-[#121214]/90 border border-white/16",
        "text-[#f5f5f5] text-xs font-semibold",
        "flex items-center justify-center",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        "select-none",
      ])}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      Dev
    </button>
  );
}

function DevtoolDrawer({
  open,
  onClose,
  onSeed,
}: {
  open: boolean;
  onClose: () => void;
  onSeed: (seed: SeedDefinition) => void;
}) {
  const ref = useAutoCloser(onClose, { esc: true, outside: true });

  return (
    <aside
      className={cn([
        "fixed top-0 right-0 h-full w-60 z-2147483000 font-sans transition-transform duration-300",
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
  const navigate = useNavigate();

  const handleShowMain = useCallback(() => {
    windowsCommands.windowShow({ type: "main" });
  }, [navigate]);

  const handleShowOnboarding = useCallback(() => {
    windowsCommands.windowShow({ type: "onboarding" }).then(() => {
      windowsCommands.windowEmitNavigate(
        { type: "onboarding" },
        { path: "/app/onboarding", search: {} },
      );
    });
  }, [navigate]);

  return (
    <DevtoolSection title="Navigation">
      <nav className="flex flex-col gap-2 text-sm">
        <button
          onClick={handleShowOnboarding}
          className="pl-2 text-left hover:underline"
        >
          Onboarding
        </button>
        <button
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
