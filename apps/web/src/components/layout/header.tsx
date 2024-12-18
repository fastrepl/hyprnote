import Image from "next/image";
import { HeaderButton } from "@/components/ui/header-button";
import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-gray-300">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" width={32} height={32} alt="HyprNote Logo" />
            <span className="text-2xl font-racing-sans">HYPRNOTE</span>
          </div>
        </Link>

        <HeaderButton />
      </div>
    </header>
  );
}
