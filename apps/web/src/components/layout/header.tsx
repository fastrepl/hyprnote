"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { HeaderButton } from "@/components/ui/header-button";
import { cn } from "@/lib/utils";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-gray-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/icon.svg" width={32} height={32} alt="HyprNote Logo" />
          <span className="text-2xl font-racing-sans">HYPRNOTE</span>
        </div>

        <HeaderButton
          className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#e5e7eb]",
            isScrolled ? "bg-[#EEF3FF] hover:bg-[#E5EDFF]" : "hover:bg-gray-50"
          )}
        />
      </div>
    </header>
  );
}
