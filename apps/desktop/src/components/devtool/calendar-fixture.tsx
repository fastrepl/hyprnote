import { useCallback, useEffect, useState } from "react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { cn } from "@hypr/utils";

export function CalendarFixtureMonitor() {
  const [fixtures, setFixtures] = useState<string[]>([]);
  const [currentFixture, setCurrentFixture] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadFixtures = async () => {
      if ("listFixtures" in appleCalendarCommands) {
        const available = await (appleCalendarCommands as any).listFixtures();
        setFixtures(available);
        const current = await (
          appleCalendarCommands as any
        ).getCurrentFixture();
        setCurrentFixture(current);
      }
    };
    loadFixtures();
  }, []);

  const handleSwitchFixture = useCallback(async (fixtureId: string) => {
    if (!("switchFixture" in appleCalendarCommands)) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await (appleCalendarCommands as any).switchFixture(
        fixtureId,
      );
      if (result.status === "ok") {
        setCurrentFixture(fixtureId);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!("listFixtures" in appleCalendarCommands)) {
    return null;
  }

  return (
    <section className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn([
          "flex items-center justify-between",
          "text-sm font-semibold",
          "hover:text-white/90",
          "transition-colors",
        ])}
      >
        <span>Calendar Fixtures</span>
        <div className="flex items-center gap-2">
          {currentFixture && (
            <span
              className={cn([
                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                "bg-purple-500/20 text-purple-400",
              ])}
            >
              {currentFixture}
            </span>
          )}
          <span
            className={cn([
              "transition-transform",
              isExpanded ? "rotate-180" : "rotate-0",
            ])}
          >
            ▼
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-1.5">
          {fixtures.map((fixture) => (
            <button
              key={fixture}
              type="button"
              onClick={() => handleSwitchFixture(fixture)}
              disabled={isLoading || fixture === currentFixture}
              className={cn([
                "w-full px-2 py-1.5 rounded-md",
                "text-[11px] font-medium text-left",
                "border",
                "cursor-pointer transition-colors",
                fixture === currentFixture
                  ? [
                      "bg-purple-500/20 border-purple-500/40 text-purple-300",
                      "cursor-default",
                    ]
                  : [
                      "border-white/8",
                      "hover:bg-white/[0.04] hover:border-white/12",
                    ],
                isLoading && "opacity-50 cursor-wait",
              ])}
            >
              <div className="flex items-center justify-between">
                <span>{formatFixtureName(fixture)}</span>
                {fixture === currentFixture && (
                  <span className="text-[9px] text-purple-400">active</span>
                )}
              </div>
            </button>
          ))}

          {fixtures.length === 0 && (
            <div
              className={cn([
                "px-2 py-3 rounded-md",
                "text-[11px] text-center text-white/40",
                "border border-white/8",
              ])}
            >
              No fixtures available
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function formatFixtureName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
