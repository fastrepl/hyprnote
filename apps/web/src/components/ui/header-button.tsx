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
        "inline-flex items-center justify-center gap-2 transition-all duration-200 rounded-xl relative",
        {
          "bg-gradient-to-br from-[#f97316] to-[#6366f1] text-white border-transparent before:opacity-100":
            isScrolled,
          "border border-gray-300 before:opacity-0": !isScrolled,
        },
        "hover:bg-gradient-to-br hover:from-[#f97316] hover:to-[#6366f1] hover:text-white hover:border-transparent hover:before:opacity-100",
        "before:content-[''] before:absolute before:inset-[1px] before:rounded-[10px] before:border before:border-white/30 before:transition-opacity before:duration-200",
        className
      )}
    >
      {os === "Windows"
        ? defaultButtonContent.windows
        : defaultButtonContent.mac}
    </Button>
  );
}
