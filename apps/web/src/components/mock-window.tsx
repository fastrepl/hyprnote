import { DancingSticks } from "@hypr/ui/components/ui/dancing-sticks";
import { cn } from "@hypr/utils";

export function MockWindow({
  showAudioIndicator,
  variant = "desktop",
  className,
  title,
  children,
}: {
  showAudioIndicator?: boolean;
  variant?: "desktop" | "mobile";
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const isMobile = variant === "mobile";

  return (
    <div
      className={cn([
        "bg-white shadow-lg border border-neutral-200 border-b-0 overflow-hidden",
        isMobile ? "rounded-t-lg" : "w-full max-w-lg rounded-t-xl",
        className,
      ])}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <div className="flex gap-2">
          <div className="size-3 rounded-full bg-red-400"></div>
          <div className="size-3 rounded-full bg-yellow-400"></div>
          <div className="size-3 rounded-full bg-green-400"></div>
        </div>

        {title && (
          <div className="flex-1 text-center">
            <span className="text-sm text-neutral-600 font-medium">
              {title}
            </span>
          </div>
        )}

        {showAudioIndicator && (
          <div className="ml-auto">
            <DancingSticks
              amplitude={1}
              size="default"
              height={isMobile ? 10 : 12}
              color="#a3a3a3"
            />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
