import { Button } from "@hypr/ui/components/ui/button";
import { SparklesIcon } from "lucide-react";
import { useState } from "react";

const TEMPLATES = [
  "Brainstorming",
  "1-on-1",
  "User Interview",
  "Daily Standup",
  "Project Plan",
  "Meeting Notes",
  "Action Items",
  "Decision Log",
  "Key Insights",
  "Brainstorming",
  "1-on-1",
];

export function FloatingRegenerateButton() {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
      {/* White card - slides up from behind */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border px-6 pb-14 transition-all duration-300 overflow-visible ${
          showTemplates
            ? "opacity-100 bottom-[-14px] pt-2 w-[270px] pointer-events-auto"
            : "opacity-0 bottom-0 pt-0 w-0 pointer-events-none"
        }`}
        style={{ zIndex: 0 }}
        onMouseEnter={() => setShowTemplates(true)}
        onMouseLeave={() => setShowTemplates(false)}
      >
        <div className={`transition-opacity duration-200 ${showTemplates ? "opacity-100" : "opacity-0"}`}>
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
            {TEMPLATES.map((template) => (
              <button
                key={template}
                className="text-center py-2 hover:bg-neutral-100 rounded transition-colors text-base"
                onClick={() => {
                  console.log("Template clicked:", template);
                  setShowTemplates(false);
                }}
              >
                {template}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-neutral-400 text-sm mt-3">
            <div className="flex-1 h-px bg-neutral-300"></div>
            <span>or</span>
            <div className="flex-1 h-px bg-neutral-300"></div>
          </div>
        </div>
      </div>

      {/* Black button - always on top */}
      <Button
        className="relative bg-black hover:bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg"
        style={{ zIndex: 10 }}
        onMouseEnter={() => setShowTemplates(true)}
        onMouseLeave={() => setShowTemplates(false)}
        onClick={() => {
          console.log("regenerate clicked");
        }}
      >
        <SparklesIcon className="w-4 h-4 mr-2" />
        Regenerate
      </Button>
    </div>
  );
}
