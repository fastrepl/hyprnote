import { OutlookIcon } from "@hypr/ui/components/icons/outlook";
import { Button } from "@hypr/ui/components/ui/button";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";

import { Icon } from "@iconify-icon/react";
import { Calendar, Plus } from "lucide-react";

import { ConnectedServiceCard } from "./shared";

// Mock data structure - replace with actual data from your store
type CalendarProvider = "google" | "outlook" | "icloud";

interface CalendarAccount {
  id: string;
  provider: CalendarProvider;
  email: string;
  connectedAt: string; // ISO date string
  calendars: {
    id: string;
    name: string;
    enabled: boolean;
  }[];
}

const MOCK_ACCOUNTS: CalendarAccount[] = [
  {
    id: "1",
    provider: "google",
    email: "john@hyprnote.com",
    connectedAt: "2024-10-15T10:30:00Z",
    calendars: [
      { id: "cal-1", name: "hyprnote", enabled: true },
      { id: "cal-2", name: "investors", enabled: true },
      { id: "cal-3", name: "birthdays", enabled: false },
    ],
  },
  {
    id: "2",
    provider: "icloud",
    email: "john@icloud.com",
    connectedAt: "2024-09-20T14:15:00Z",
    calendars: [
      { id: "cal-4", name: "personal", enabled: true },
    ],
  },
];

function getProviderIcon(provider: CalendarProvider) {
  if (provider === "outlook") {
    return <OutlookIcon size={20} className="shrink-0" />;
  }

  const iconMap: Record<Exclude<CalendarProvider, "outlook">, string> = {
    google: "logos:google-calendar",
    icloud: "logos:apple",
  };

  return <Icon icon={iconMap[provider]} className="w-5 h-5 shrink-0" />;
}

function getProviderName(provider: CalendarProvider) {
  switch (provider) {
    case "google":
      return "Google Calendar";
    case "outlook":
      return "Outlook";
    case "icloud":
      return "iCloud";
  }
}

export function SettingsCalendar() {
  // TODO: Replace with actual state management
  const accounts = MOCK_ACCOUNTS;

  const handleToggleCalendar = (accountId: string, calendarId: string) => {
    // TODO: Implement toggle logic
    console.log("Toggle calendar:", accountId, calendarId);
  };

  const handleAddAccount = () => {
    // TODO: Implement add account logic
    console.log("Add account");
  };

  const handleRemoveAccount = (accountId: string) => {
    // TODO: Implement remove account logic
    console.log("Remove account:", accountId);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Connected Calendars</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddAccount}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Add Account
          </Button>
        </div>

        <div className="space-y-6">
          {accounts.length === 0
            ? (
              <div className="text-center py-12 text-neutral-500">
                <Calendar size={48} className="mx-auto mb-4 text-neutral-300" />
                <p className="text-sm">No calendar accounts connected</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Add an account to sync your calendar events
                </p>
              </div>
            )
            : (
              accounts.map((account) => (
                <CalendarAccountSection
                  key={account.id}
                  account={account}
                  onToggleCalendar={handleToggleCalendar}
                  onRemoveAccount={handleRemoveAccount}
                />
              ))
            )}
        </div>
      </div>
    </div>
  );
}

function CalendarAccountSection({
  account,
  onToggleCalendar,
  onRemoveAccount,
}: {
  account: CalendarAccount;
  onToggleCalendar: (accountId: string, calendarId: string) => void;
  onRemoveAccount: (accountId: string) => void;
}) {
  const handleSync = async () => {
    // Mock sync process - simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Synced account:", account.id);
  };

  const handleReconnect = async () => {
    // Mock reconnect process - simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Reconnected account:", account.id);
  };

  const handleDisconnect = () => {
    onRemoveAccount(account.id);
  };

  return (
    <ConnectedServiceCard
      icon={getProviderIcon(account.provider)}
      title={account.email}
      onSync={handleSync}
      onReconnect={handleReconnect}
      onDisconnect={handleDisconnect}
      connectedAt={account.connectedAt}
      disconnectDialogTitle="Disconnect Calendar Account?"
      disconnectDialogDescription={
        <>
          Are you sure you want to disconnect <strong>{account.email}</strong> from{" "}
          {getProviderName(account.provider)}? Your calendar events will no longer sync with Hyprnote.
        </>
      }
    >
      <div className="space-y-3">
        {account.calendars.map((calendar) => (
          <div key={calendar.id} className="flex items-center space-x-3">
            <Checkbox
              id={`calendar-${calendar.id}`}
              checked={calendar.enabled}
              onCheckedChange={() => onToggleCalendar(account.id, calendar.id)}
            />
            <label
              htmlFor={`calendar-${calendar.id}`}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {calendar.name}
            </label>
          </div>
        ))}
      </div>
    </ConnectedServiceCard>
  );
}
