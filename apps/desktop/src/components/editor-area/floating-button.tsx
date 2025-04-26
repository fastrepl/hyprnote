import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { RefreshCwIcon, TypeOutlineIcon, WandSparklesIcon, ZapIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useEnhancePendingState } from "@/hooks/enhance-pending";
import { commands as dbCommands, type Session, type Template } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { SplashLoader } from "@hypr/ui/components/ui/splash";
import { cn } from "@hypr/ui/lib/utils";
import { useSession } from "@hypr/utils/contexts";

interface FloatingButtonProps {
  session: Session;
  handleEnhance: (templateId?: string) => void;
}

export function FloatingButton({
  session,
  handleEnhance,
}: FloatingButtonProps) {
  const [showRaw, setShowRaw] = useSession(session.id, (s) => [
    s.showRaw,
    s.setShowRaw,
  ]);
  const isEnhancePending = useEnhancePendingState(session.id);
  const [isHovered, setIsHovered] = useState(false);
  const [showRefreshIcon, setShowRefreshIcon] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isAutoHovered, setIsAutoHovered] = useState(false);

  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => dbCommands.listTemplates(),
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (!isHovered) {
      setShowRefreshIcon(true);
    }
  }, [isHovered]);

  const handleRawView = () => {
    setShowRaw(true);
  };

  const handleEnhanceWithTemplate = (templateId?: string) => {
    if (!isEnhancePending) {
      handleEnhance(templateId);
      setPopoverOpen(false);
    }
  };

  const handleSwitchToEnhanced = () => {
    setShowRaw(false);
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
            className={enhanceButtonClasses}
            disabled={isEnhancePending}
            onClick={handleSwitchToEnhanced}
          >
            {isEnhancePending
              ? <SplashLoader size={20} strokeWidth={2} />
              : <IconToggle showRefresh={showRefresh} />}
          </button>
        )
        : (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={enhanceButtonClasses}
                disabled={isEnhancePending}
              >
                {isEnhancePending
                  ? <SplashLoader size={20} strokeWidth={2} />
                  : <IconToggle showRefresh={showRefresh} />}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 shadow-lg rounded-lg border border-neutral-200 bg-white">
              <div className="space-y-1">
                <button
                  className="w-full flex items-center px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 font-medium hover:text-black rounded-md transition-colors duration-150"
                  onClick={() => handleEnhanceWithTemplate()}
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
                    className="w-full flex items-center px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors duration-150"
                  >
                    <span className="mr-2 w-4 h-4 flex items-center justify-center">
                      📄
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

interface SparklingIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: number;
}

function SparklingIcon({ size = 20, className, ...rest }: SparklingIconProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
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
      {...rest}
    />
  );
}
