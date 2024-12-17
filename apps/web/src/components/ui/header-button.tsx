"use client";

import { Button } from "@/components/ui/button";
import { RiAppleFill, RiWindowsFill } from "@remixicon/react";
import { useOS } from "@/hooks/useOS";
import cn from "clsx";
import { useEffect, useState } from "react";

interface HeaderButtonProps {
  className?: string;
}

const defaultButtonContent = {
  mac: (
    <>
      <RiAppleFill className="w-4 h-4" />
      <span>Download</span>
    </>
  ),
  windows: (
    <>
      <RiWindowsFill className="w-4 h-4" />
      <span>Join Waitlist</span>
    </>
  ),
};

export function HeaderButton({ className }: HeaderButtonProps) {
  const os = useOS();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Button
      variant="outline"
      size="default"
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-200 rounded-xl border border-gray-300 hover:border-gray-400",
        {
          "bg-gradient-to-br from-[#fbbf24] to-[#2563eb] text-white":
            isScrolled,
        },
        "hover:bg-gradient-to-br hover:from-[#fbbf24] hover:to-[#2563eb] hover:text-white",
        className,
      )}
    >
      {os === "Windows"
        ? defaultButtonContent.windows
        : defaultButtonContent.mac}
    </Button>
  );
}
