import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import clsx from "clsx";
import { useEffect, useState } from "react";

export function HyprAIButton() {
  const [isDynamic, setIsDynamic] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsDynamic(true);

      // Switch back to static after 1.625 seconds
      const timeout = setTimeout(() => {
        setIsDynamic(false);
      }, 1625);

      return () => clearTimeout(timeout);
    }, 6625); // Total cycle time: 5s static + 1.625s dynamic

    return () => clearInterval(interval);
  }, []);

  return (
    <Popover>
      <PopoverTrigger
        className={clsx([
          "absolute bottom-7 right-7 flex items-center justify-center rounded-full border border-border bg-white p-1 shadow-md",
        ])}
      >
        <img
          src={isDynamic ? "/assets/dynamic.gif" : "/assets/static.png"}
          alt="Help"
          className="size-14"
        />
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="mb-2">
        Content here.
      </PopoverContent>
    </Popover>
  );
}
