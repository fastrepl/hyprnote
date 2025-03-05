import { Zap } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";

interface EnhanceOnlyButtonProps {
  handleClick: () => void;
}

export function EnhanceOnlyButton({ handleClick }: EnhanceOnlyButtonProps) {
  return (
    <Button variant="default" size="lg" onClick={handleClick}>
      <Zap size={20} />
      Hypercharge Note
    </Button>
  );
}
