import { cn } from "@hypr/ui/lib/utils";
import { GlobeIcon } from "lucide-react";
import React from "react";

export const RatingDisplay = (
  { label, rating, maxRating = 3, icon: Icon }: {
    label: string;
    rating: number;
    maxRating?: number;
    icon: React.ElementType;
  },
) => (
  <div className="flex flex-col items-center px-2">
    <span className="text-[10px] text-neutral-500 uppercase font-medium tracking-wider mb-1.5">{label}</span>
    <div className="flex space-x-1">
      {[...Array(maxRating)].map((_, i) => (
        <Icon
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < rating ? "text-blue-500" : "text-neutral-300",
          )}
        />
      ))}
    </div>
  </div>
);

export const LanguageDisplay = ({ support }: { support: "multilingual" | "english-only" }) => (
  <div className="flex flex-col items-center px-2">
    <span className="text-[10px] text-neutral-500 uppercase font-medium tracking-wider mb-1.5">Language</span>
    <div className="flex items-center">
      <GlobeIcon className={cn("w-3.5 h-3.5", support === "multilingual" ? "text-blue-500" : "text-neutral-300")} />
      <span className="text-xs ml-1">
        {support === "multilingual" ? "All" : "EN"}
      </span>
    </div>
  </div>
);
