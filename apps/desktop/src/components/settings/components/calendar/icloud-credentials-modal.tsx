import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@hypr/ui/components/ui/modal";
import { cn } from "@hypr/ui/lib/utils";

interface ICloudCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ICloudCredentialsModal({
  isOpen,
  onClose,
  onSuccess,
}: ICloudCredentialsModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [caldavUrl, setCaldavUrl] = useState("https://caldav.icloud.com");
  const [carddavUrl, setCarddavUrl] = useState("https://contacts.icloud.com");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Load existing credentials when modal opens
  const existingCredentials = useQuery({
    queryKey: ["caldav", "credentials"],
    queryFn: () => appleCalendarCommands.getCaldavCredentials(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (existingCredentials.data) {
      setUsername(existingCredentials.data.username || "");
      setPassword(existingCredentials.data.password || "");
      setCaldavUrl(existingCredentials.data.caldav_url || "https://caldav.icloud.com");
      setCarddavUrl(existingCredentials.data.carddav_url || "https://contacts.icloud.com");
    }
  }, [existingCredentials.data]);

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      // First save the credentials temporarily
      await appleCalendarCommands.setCaldavCredentials({
        username,
        password,
        caldav_url: caldavUrl,
        carddav_url: carddavUrl,
      });
      
      // Then test the connection
      const result = await appleCalendarCommands.testCaldavConnection();
      return result;
    },
    onMutate: () => {
      setTestStatus("testing");
      setErrorMessage("");
    },
    onSuccess: (success) => {
      if (success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setErrorMessage("Failed to connect. Please check your credentials.");
      }
    },
    onError: (error) => {
      setTestStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Connection test failed");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await appleCalendarCommands.setCaldavCredentials({
        username,
        password,
        caldav_url: caldavUrl,
        carddav_url: carddavUrl,
      });
    },
    onSuccess: () => {
      onSuccess?.();
      handleClose();
    },
  });

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  const handleSave = () => {
    if (testStatus === "success") {
      // Already saved during test
      onSuccess?.();
      handleClose();
    } else {
      // Save without testing
      saveMutation.mutate();
    }
  };

  const handleClose = () => {
    setUsername("");
    setPassword("");
    setCaldavUrl("https://caldav.icloud.com");
    setCarddavUrl("https://contacts.icloud.com");
    setShowAdvanced(false);
    setTestStatus("idle");
    setErrorMessage("");
    onClose();
  };

  const isFormValid = username.trim() !== "" && password.trim() !== "";

  return (
    <Modal open={isOpen} onClose={handleClose} size="md">
      <ModalHeader className="p-6 pb-2">
        <ModalTitle>
          <Trans>Configure iCloud Calendar</Trans>
        </ModalTitle>
        <ModalDescription className="mt-1">
          <Trans>
            Enter your Apple ID and an app-specific password to sync your iCloud calendar
          </Trans>
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apple-id">
            <Trans>Apple ID</Trans>
          </Label>
          <Input
            id="apple-id"
            type="email"
            placeholder="you@icloud.com"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-password">
            <Trans>App-Specific Password</Trans>
          </Label>
          <Input
            id="app-password"
            type="password"
            placeholder="xxxx-xxxx-xxxx-xxxx"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <p className="text-xs text-muted-foreground">
            <Trans>
              Generate an app-specific password at{" "}
            </Trans>
            <a
              href="https://appleid.apple.com/account/manage"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              appleid.apple.com
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          </p>
        </div>

        {/* Advanced settings */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? "▼" : "▶"} <Trans>Advanced Settings</Trans>
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="caldav-url">
                <Trans>CalDAV Server URL</Trans>
              </Label>
              <Input
                id="caldav-url"
                type="url"
                value={caldavUrl}
                onChange={(e) => setCaldavUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carddav-url">
                <Trans>CardDAV Server URL</Trans>
              </Label>
              <Input
                id="carddav-url"
                type="url"
                value={carddavUrl}
                onChange={(e) => setCarddavUrl(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Test connection status */}
        {testStatus !== "idle" && (
          <div
            className={cn(
              "rounded-md p-3 text-sm",
              testStatus === "testing" && "bg-blue-50 text-blue-900",
              testStatus === "success" && "bg-green-50 text-green-900",
              testStatus === "error" && "bg-red-50 text-red-900",
            )}
          >
            {testStatus === "testing" && (
              <div className="flex items-center gap-2">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <Trans>Testing connection...</Trans>
              </div>
            )}
            {testStatus === "success" && (
              <Trans>✓ Connection successful! You can now save your credentials.</Trans>
            )}
            {testStatus === "error" && (
              <div>
                <Trans>✗ Connection failed</Trans>
                {errorMessage && <div className="mt-1 text-xs">{errorMessage}</div>}
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={!isFormValid || testConnectionMutation.isPending}
        >
          {testConnectionMutation.isPending
            ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                <Trans>Testing...</Trans>
              </>
            )
            : <Trans>Test Connection</Trans>}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isFormValid || saveMutation.isPending}
        >
          {saveMutation.isPending
            ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                <Trans>Saving...</Trans>
              </>
            )
            : <Trans>Save</Trans>}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
