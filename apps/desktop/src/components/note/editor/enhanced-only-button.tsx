import { Zap } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";

interface EnhanceOnlyButtonProps {
  handleClick: () => void;
}

export function EnhanceOnlyButton({ handleClick }: EnhanceOnlyButtonProps) {
  return (
    <Button
      variant="default"
      size="lg"
      onClick={handleClick}
      className="dark:bg-white dark:text-black dark:hover:bg-neutral-200 hover:scale-95 transition-all"
    >
      <Zap size={20} />
      Hypercharge
    </Button>
  );
}
