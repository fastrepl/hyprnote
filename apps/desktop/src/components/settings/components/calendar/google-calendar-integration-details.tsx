import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-shell";

import { commands as googleCalendarCommands, GoogleAccount, CalendarSelection } from "@hypr/plugin-google-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import { toast } from "@hypr/ui/components/ui/toast";
import { Trash2, Calendar, Users, Plus } from "lucide-react";
// Component to display and manage calendars for a specific Google account
function GoogleAccountCalendars({ email }: { email: string }) {
  const { data: calendarSelections, refetch: refetchCalendarSelections } = useQuery({
    queryKey: ["settings", "googleCalendarSelections", email],
    queryFn: () => googleCalendarCommands.getCalendarSelections(email),
    enabled: true,
  });

  const toggleCalendarSelectedMutation = useMutation({
    mutationFn: ({ calendarId, selected }: { calendarId: string; selected: boolean }) => 
      googleCalendarCommands.setCalendarSelected(email, calendarId, selected),
    onSuccess: () => {
      refetchCalendarSelections();
    },
    onError: (error) => {
      toast({
        id: `calendar-toggle-error-${email}`,
        title: "Calendar Toggle Error",
        content: `Failed to update calendar selection: ${error}`,
        dismissible: true,
        duration: 5000,
      });
    },
  });

  if (!calendarSelections || calendarSelections.length === 0) {
    return null;
  }

  const selectedCount = calendarSelections.filter(cal => cal.selected).length;
  const totalCount = calendarSelections.length;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        <Trans>Calendars ({selectedCount}/{totalCount} selected)</Trans>
      </div>
      <div className="space-y-2">
        {calendarSelections.map((calSelection: CalendarSelection) => (
          <div key={calSelection.calendarId} className="flex items-center space-x-3 py-1 px-2 rounded-md hover:bg-gray-50 transition-colors">
            <Checkbox
              id={`calendar-${calSelection.calendarId}`}
              checked={calSelection.selected}
              onCheckedChange={(checked) => 
                toggleCalendarSelectedMutation.mutate({ 
                  calendarId: calSelection.calendarId, 
                  selected: checked as boolean 
                })
              }
              className="h-4 w-4"
            />
            <div className="flex items-center gap-2 flex-1">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: calSelection.color || "#9e9e9e" }}
              />
              <label
                htmlFor={`calendar-${calSelection.calendarId}`}
                className="text-sm font-medium cursor-pointer text-gray-700 flex-1"
              >
                {calSelection.calendarName}
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GoogleCalendarIntegrationDetails() {

  // Get connected accounts
  const connectedAccounts = useQuery({
    queryKey: ["settings", "googleConnectedAccounts"],
    queryFn: () => googleCalendarCommands.getConnectedAccounts(),
    refetchInterval: 2000,
  });

  // Track previous account count to detect new connections
  const previousAccountCountRef = useRef<number>(0);
  
  useEffect(() => {
    const currentAccounts = connectedAccounts.data?.connectedAccounts || [];
    const currentCount = currentAccounts.length;
    
    // Show success toast when a new account is added
    if (currentCount > previousAccountCountRef.current && previousAccountCountRef.current > 0) {
      const newAccount = currentAccounts[currentCount - 1];
      toast({
        id: `account-connected-${newAccount.email}`,
        title: "Account Connected!",
        content: `Successfully connected ${newAccount.name} (${newAccount.email})`,
        dismissible: true,
        duration: 4000,
      });
    }
    
    previousAccountCountRef.current = currentCount;
  }, [connectedAccounts.data]);

  const handleAddAccount = useCallback(async () => {
    try {
      const authUrl = await googleCalendarCommands.addGoogleAccount();
      
      // Open auth URL in default browser using Tauri shell (bypasses popup blockers)
      try {
        await open(authUrl);
      } catch (shellError) {
        // Fallback to window.open
        const opened = window.open(authUrl, '_blank');
        
        if (!opened) {
          // Copy to clipboard as last resort
          try {
            await navigator.clipboard.writeText(authUrl);
                toast({
                  id: "auth-url-copied",
                  title: "Authorization URL Copied",
                  content: "Failed to open Google authorization automatically. The URL has been copied to your clipboard - please paste it in your browser.",
                  dismissible: true,
                  duration: 8000,
                });
          } catch (clipboardError) {
                toast({
                  id: "auth-url-manual",
                  title: "Manual Authorization Required",
                  content: `Please copy this URL manually and open it in your browser: ${authUrl.substring(0, 80)}...`,
                  dismissible: true,
                  duration: 10000,
                });
          }
        }
      }
      
      // Refetch accounts after a delay to allow time for auth
      setTimeout(() => {
        connectedAccounts.refetch();
      }, 5000);
        } catch (error) {
          toast({
            id: "add-account-error",
            title: "Connection Error", 
            content: `Failed to start Google authorization: ${error}`,
            dismissible: true,
            duration: 5000,
          });
        }
  }, [connectedAccounts]);

  const handleRemoveAccount = useCallback(async (email: string) => {
    toast({
      id: `disconnect-${email}`,
      title: "Disconnect Google Account",
      content: `Are you sure you want to disconnect ${email}? This will remove access to your Google Calendar and Contacts.`,
      buttons: [
        {
          label: "Cancel",
          onClick: () => {
            // Toast will auto-dismiss
          },
        },
        {
          label: "Disconnect",
          primary: true,
          onClick: async () => {
            try {
              await googleCalendarCommands.removeGoogleAccount(email);
              
              // Refetch accounts immediately
              connectedAccounts.refetch();
              
              // Show success toast
              toast({
                id: `disconnected-${email}`,
                title: "Account Disconnected",
                content: `Successfully disconnected ${email}`,
                dismissible: true,
                duration: 3000,
              });
            } catch (error) {
              toast({
                id: `error-${email}`,
                title: "Error",
                content: `Failed to disconnect account: ${error}`,
                dismissible: true,
                duration: 5000,
              });
            }
          },
        },
      ],
      dismissible: true,
    });
  }, [connectedAccounts]);

  const accounts = connectedAccounts.data?.connectedAccounts || [];
  const hasAnyAccount = accounts.length > 0;

  return (
    <div className="space-y-4">
      {/* Add Account Button */}
      <div className="flex flex-col rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/icons/google-calendar.png"
              alt="Google Calendar & Contacts"
              className="size-6"
            />
            <div>
              <div className="text-sm font-medium">
                <Trans>Google Calendar & Contacts</Trans>
              </div>
              <div className="text-xs text-muted-foreground">
                {hasAnyAccount ? (
                  <Trans>{accounts.length} account(s) connected</Trans>
                ) : (
                  <Trans>Connect your Google services</Trans>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddAccount}
            className="min-w-12 text-center"
          >
            <Plus className="h-3 w-3 mr-1" />
            <Trans>Add Account</Trans>
          </Button>
        </div>
      </div>

      {/* Connected Accounts List */}
      {hasAnyAccount && (
        <div className="space-y-3">
          {accounts.map((account: GoogleAccount) => (
            <div key={account.email} className="flex flex-col rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                    {account.picture ? (
                      <img
                        src={account.picture}
                        alt={account.name}
                        className="size-8 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {account.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{account.name}</div>
                    <div className="text-xs text-muted-foreground">{account.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {account.calendarAccess && (
                    <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      <Trans>Calendar</Trans>
                    </div>
                  )}
                  {account.contactsAccess && (
                    <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                      <Users className="h-3 w-3" />
                      <Trans>Contacts</Trans>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRemoveAccount(account.email)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Show calendars for this account */}
              {account.calendarAccess && (
                <GoogleAccountCalendars email={account.email} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
