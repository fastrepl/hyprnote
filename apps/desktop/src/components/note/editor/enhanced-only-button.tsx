import { Zap } from "lucide-react";
import clsx from "clsx";

interface EnhanceOnlyButtonProps {
  handleClick: () => void;
}

export function EnhanceOnlyButton({ handleClick }: EnhanceOnlyButtonProps) {
  return (
    <button
      className={clsx([
        "rounded-xl border border-border",
        "duration-400 transition-all ease-in-out",
        "px-6 py-2",
        "bg-primary/20",
        "text-primary",
      ])}
      onClick={handleClick}
    >
      <Zap size={20} className={"fill-primary/60"} />
    </button>
  );
}
