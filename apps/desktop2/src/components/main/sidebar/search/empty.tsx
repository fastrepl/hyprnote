import { cn } from "@hypr/ui/lib/utils";

export function SearchNoResults() {
  return (
    <div className={cn(["h-full flex items-center justify-center"])}>
      <div className={cn(["text-center px-4"])}>
        <p className={cn(["text-sm text-gray-600"])}>No results found</p>
        <p className={cn(["text-xs text-gray-400 mt-1"])}>
          Try a different search term
        </p>
      </div>
    </div>
  );
}
