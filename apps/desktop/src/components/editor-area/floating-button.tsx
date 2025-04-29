import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon, TypeOutlineIcon, WandSparklesIcon, XIcon, ZapIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as dbCommands, type Session, type Template } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { SplashLoader as EnhanceWIP } from "@hypr/ui/components/ui/splash";
import { cn } from "@hypr/ui/lib/utils";
import { useOngoingSession, useSession } from "@hypr/utils/contexts";

interface FloatingButtonProps {
  session: Session;
  handleEnhance: (templateId?: string) => void; // Accept optional templateId
}

export function FloatingButton({
  session,
  handleEnhance,
}: FloatingButtonProps) {
  const [showRaw, setShowRaw] = useSession(session.id, (s) => [
    s.showRaw,
    s.setShowRaw,
  ]);
  const cancelEnhance = useOngoingSession((s) => s.cancelEnhance);
  const isEnhancePending = useEnhancePendingState(session.id);
  const [isHovered, setIsHovered] = useState(false);
  const [showRefreshIcon, setShowRefreshIcon] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isAutoHovered, setIsAutoHovered] = useState(false);

  // Fetch templates
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => dbCommands.listTemplates(),
    refetchInterval: 1000, // Consider if this interval is necessary
  });

  useEffect(() => {
    if (!isHovered) {
      setShowRefreshIcon(true);
    }
  }, [isHovered]);

  const handleRawView = () => {
    setShowRaw(true);
  };

  // Renamed from handleEnhanceOrReset
  const handleToggleEnhanceView = () => {
    if (showRaw) {
      setShowRaw(false);
      // setShowRefreshIcon(false); // Keep refresh icon logic tied to hover
      return;
    }

    // This button (when not raw) now primarily toggles popover or cancels
    if (isEnhancePending) {
      cancelEnhance();
    } else {
      // If not pending and not raw, clicking the main button does nothing
      // It acts as the PopoverTrigger now.
      // Enhancement is triggered *from* the popover content.
    }
  };

  // Handler for actions within the popover
  const handleEnhanceWithTemplate = (templateId?: string) => {
    if (!isEnhancePending) {
      handleEnhance(templateId);
      setPopoverOpen(false); // Close popover after selection
    }
  };

  if (!session.enhanced_memo_html && !isEnhancePending) {
    return null;
  }

  const rawButtonClasses = cn(
    "rounded-l-xl border-l border-y",
    "border-border px-4 py-2.5 transition-all ease-in-out",
    showRaw
      ? "bg-primary text-primary-foreground border-black hover:bg-neutral-800"
      : "bg-background text-neutral-400 hover:bg-neutral-100",
  );

  const enhanceButtonClasses = cn(
    "rounded-r-xl border-r border-y",
    "border border-border px-4 py-2.5 transition-all ease-in-out",
    showRaw
      ? "bg-background text-neutral-400 hover:bg-neutral-100"
      : "bg-primary text-primary-foreground border-black hover:bg-neutral-800",
  );

  const showRefresh = !showRaw && isHovered && showRefreshIcon;

  const enhanceButtonContent = isEnhancePending
    ? isHovered ? <XIcon size={20} /> : <EnhanceWIP size={20} strokeWidth={2} />
    : <IconToggle showRefresh={showRefresh} />;

  return (
    <div className="flex w-fit flex-row items-center group hover:scale-105 transition-transform duration-200 shadow overflow-clip rounded-xl">
      <button
        disabled={isEnhancePending}
        onClick={handleRawView}
        className={rawButtonClasses}
      >
        <TypeOutlineIcon size={20} />
      </button>

      {showRaw
        ? (
          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleToggleEnhanceView} // Switches view, doesn't trigger enhance
            className={enhanceButtonClasses}
            disabled={isEnhancePending} // Disable if enhance is running in background
          >
            {enhanceButtonContent}
          </button>
        )
        : isEnhancePending
        ? (
          <button
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleToggleEnhanceView} // Calls cancelEnhance
            className={enhanceButtonClasses}
          >
            {enhanceButtonContent}
          </button>
        )
        : (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={enhanceButtonClasses}
              >
                {enhanceButtonContent}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 shadow-lg rounded-lg border border-neutral-200 bg-white">
              <div className="space-y-1">
                <button
                  className="w-full flex items-center px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 font-medium hover:text-black rounded-md transition-colors duration-150"
                  onClick={() => handleEnhanceWithTemplate()} // Auto enhance (no template)
                  onMouseEnter={() => setIsAutoHovered(true)}
                  onMouseLeave={() => setIsAutoHovered(false)}
                >
                  {isAutoHovered
                    ? <SparklingIcon size={16} className="mr-2" />
                    : <WandSparklesIcon size={16} className="mr-2" />}
                  <Trans>Auto Enhance</Trans>
                </button>
                {templates.data && templates.data.length > 0 && <hr className="my-1 border-neutral-200" />}
                {templates.data?.map((template: Template) => (
                  <button
                    key={template.id}
                    onClick={() => handleEnhanceWithTemplate(template.id)}
                    className="w-full flex items-center px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors duration-150"
                  >
                    <span className="mr-2 w-4 h-4 flex items-center justify-center">
                      {"📄"}
                    </span>
                    {template.title}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
    </div>
  );
}

// Renamed from RunOrRerun
function IconToggle({ showRefresh }: { showRefresh: boolean }) {
  return (
    <div className="relative h-5 w-5">
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          showRefresh ? "opacity-100" : "opacity-0",
        )}
      >
        <RefreshCwIcon size={20} />
      </div>
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          showRefresh ? "opacity-0" : "opacity-100",
        )}
      >
        <ZapIcon size={20} />
      </div>
    </div>
  );
}

// Added SparklingIcon component
function SparklingIcon({ size = 20, className }: { size?: number; className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // TODO: Define these icon paths properly, perhaps import them or use a sprite
  const iconPaths = [
    "/icons/sparkle 1.svg",
    "/icons/sparkle 2.svg",
    "/icons/sparkle 3.svg",
    "/icons/sparkle 4.svg",
  ];

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % iconPaths.length);
    }, 150);

    return () => clearInterval(intervalId);
  }, [iconPaths.length]);

  return (
    <img
      src={iconPaths[currentIndex]}
      alt="Sparkling icon animation"
      width={size}
      height={size}
      className={cn("inline-block", className)}
    />
  );
}
