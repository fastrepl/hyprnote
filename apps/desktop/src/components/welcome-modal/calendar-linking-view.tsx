import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarIcon, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";

interface CalendarProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  available: boolean;
}

interface CalendarLinkingViewProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function CalendarLinkingView({ onComplete, onSkip }: CalendarLinkingViewProps) {
  const calendarStatus = useQuery({
    queryKey: ["calendar", "status"],
    queryFn: () => appleCalendarCommands.calendarAccessStatus(),
  });

  const requestCalendarAccess = useMutation({
    mutationFn: () => appleCalendarCommands.requestCalendarAccess(),
    onSuccess: () => {
      calendarStatus.refetch();
      // Auto-continue after successful calendar linking
      setTimeout(() => {
        onComplete();
      }, 1500);
    },
    onError: (error) => {
      console.error("Calendar access request failed:", error);
    },
  });

  const calendarProviders: CalendarProvider[] = [
    {
      id: "apple",
      name: "Apple Calendar",
      icon: <CalendarIcon className="h-6 w-6" />,
      available: true,
    },
    {
      id: "google",
      name: "Google Calendar",
      icon: <CalendarIcon className="h-6 w-6" />,
      available: false, // Not yet implemented
    },
    {
      id: "outlook",
      name: "Outlook",
      icon: <CalendarIcon className="h-6 w-6" />,
      available: false, // Not yet implemented
    },
  ];

  const isCalendarGranted = calendarStatus.data === true;

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-xs text-blue-700 mb-3">
          <Trans>Optional</Trans>
        </div>

        <CalendarIcon className="h-6 w-6 mx-auto mb-3 text-neutral-600" />

        <h2 className="text-xl font-semibold mb-2">
          <Trans>Want to link your calendars?</Trans>
        </h2>

        <p className="text-sm text-muted-foreground max-w-sm">
          <Trans>Automatically label meetings and keep everything organized.</Trans>
        </p>
      </div>

      <div className="w-full max-w-md mb-6">
        <div className="grid gap-3">
          {calendarProviders.map((provider, index) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 transition-all",
                provider.available
                  ? "cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                  : "opacity-50 cursor-not-allowed bg-neutral-50",
              )}
              onClick={() => {
                if (provider.available && provider.id === "apple" && !isCalendarGranted) {
                  requestCalendarAccess.mutate();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg border">
                  {provider.icon}
                </div>
                <div>
                  <div className="font-medium text-sm">{provider.name}</div>
                  {!provider.available && <div className="text-xs text-muted-foreground">Coming soon</div>}
                </div>
              </div>

              <div className="flex items-center">
                {provider.id === "apple" && isCalendarGranted && <CheckCircle className="h-5 w-5 text-green-600" />}
                {provider.id === "apple" && !isCalendarGranted && requestCalendarAccess.isPending && (
                  <Spinner className="h-5 w-5" />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="px-6 py-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <Trans>Skip for Now</Trans>
        </Button>

        <PushableButton
          onClick={onComplete}
          disabled={requestCalendarAccess.isPending}
          className="px-6 py-2 bg-black text-white hover:bg-neutral-800 transition-colors rounded-lg font-medium"
        >
          <Trans>Continue</Trans>
        </PushableButton>
      </div>
    </div>
  );
}
