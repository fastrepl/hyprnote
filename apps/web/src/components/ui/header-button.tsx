"use client";

import { Button } from "@/components/ui/button";
import { RiAppleFill, RiWindowsFill } from "@remixicon/react";
import { useOS } from "@/hooks/useOS";
import cn from "classnames";
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
          "bg-gradient-to-br from-[#f97316] to-[#6366f1] text-white border-transparent hover:from-[#f97316] border border-gray-300 hover:border-gray-400 hover:to-[#6366f1] hover:text-white":
            isScrolled,
        },
        className
      )}
    >
      {os === "Windows"
        ? defaultButtonContent.windows
        : defaultButtonContent.mac}
    </Button>
  );
}
