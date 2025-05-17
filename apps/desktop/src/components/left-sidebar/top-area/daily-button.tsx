import { useNavigate } from "@tanstack/react-router";
import { Calendar1Icon } from "lucide-react";

import { daily } from "@/utils";
import { Button } from "@hypr/ui/components/ui/button";

export function DailyButton() {
  const navigate = useNavigate();

  const handleClickCalendar = () => {
    navigate({ to: "/app/daily/$date", params: { date: daily.today() } });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClickCalendar}
      className="hover:bg-neutral-200"
    >
      <Calendar1Icon className="size-4" />
    </Button>
  );
}
