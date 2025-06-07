import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CloudLightningIcon, MapPinIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { commands as flagsCommands } from "@hypr/plugin-flags";
import { commands as locationCommands } from "@hypr/plugin-location-connectivity";
import { Switch } from "@hypr/ui/components/ui/switch";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";

export default function Lab() {
  return (
    <div>
      <div className="space-y-4">
        <CloudPreview />
        <LocationBasedConnectivity />
      </div>
    </div>
  );
}

function CloudPreview() {
  const flagQuery = useQuery({
    queryKey: ["flags", "CloudPreview"],
    queryFn: () => flagsCommands.isEnabled("CloudPreview"),
  });

  const flagMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        flagsCommands.enable("CloudPreview");
      } else {
        flagsCommands.disable("CloudPreview");
      }
    },
    onSuccess: () => {
      flagQuery.refetch();
    },
  });

  const handleToggle = (enabled: boolean) => {
    flagMutation.mutate(enabled);
  };

  return (
    <FeatureFlag
      title="Hyprnote Cloud"
      description="Access to the latest AI model for Hyprnote Pro"
      icon={<CloudLightningIcon />}
      enabled={flagQuery.data ?? false}
      onToggle={handleToggle}
    />
  );
}

function LocationBasedConnectivity() {
  const [newSsid, setNewSsid] = useState("");

  const enabledQuery = useQuery({
    queryKey: ["location-connectivity", "enabled"],
    queryFn: () => locationCommands.isLocationBasedEnabled(),
  });

  const trustedSsidsQuery = useQuery({
    queryKey: ["location-connectivity", "trusted-ssids"],
    queryFn: () => locationCommands.getTrustedSsids(),
  });

  const currentSsidQuery = useQuery({
    queryKey: ["location-connectivity", "current-ssid"],
    queryFn: () => locationCommands.getCurrentSsid(),
    refetchInterval: 5000, // Check every 5 seconds
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await locationCommands.setLocationBasedEnabled(enabled);
    },
    onSuccess: () => {
      enabledQuery.refetch();
      trustedSsidsQuery.refetch();
    },
  });

  const addSsidMutation = useMutation({
    mutationFn: async (ssid: string) => {
      await locationCommands.addTrustedSsid(ssid);
    },
    onSuccess: () => {
      trustedSsidsQuery.refetch();
      setNewSsid("");
    },
  });

  const removeSsidMutation = useMutation({
    mutationFn: async (ssid: string) => {
      await locationCommands.removeTrustedSsid(ssid);
    },
    onSuccess: () => {
      trustedSsidsQuery.refetch();
    },
  });

  const handleAddCurrentSsid = () => {
    if (currentSsidQuery.data) {
      addSsidMutation.mutate(currentSsidQuery.data);
    }
  };

  const handleAddCustomSsid = () => {
    if (newSsid.trim()) {
      addSsidMutation.mutate(newSsid.trim());
    }
  };

  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            <MapPinIcon />
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>Location-Based Connectivity</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              <Trans>Automatically switch to cloud AI when in trusted locations</Trans>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={enabledQuery.data ?? false}
            onCheckedChange={toggleMutation.mutate}
            color="gray"
          />
        </div>
      </div>

      {enabledQuery.data && (
        <div className="space-y-4">
          {/* Current WiFi Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="text-sm font-medium">Current Network</div>
              <div className="text-xs text-muted-foreground">
                {currentSsidQuery.data ? (
                  <>
                    {currentSsidQuery.data}
                    {trustedSsidsQuery.data?.includes(currentSsidQuery.data) && (
                      <span className="ml-2 text-green-600">• Trusted</span>
                    )}
                  </>
                ) : (
                  "No WiFi connected"
                )}
              </div>
            </div>
            {currentSsidQuery.data && 
              !trustedSsidsQuery.data?.includes(currentSsidQuery.data) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddCurrentSsid}
                disabled={addSsidMutation.isPending}
              >
                <PlusIcon className="size-4 mr-1" />
                Add Current
              </Button>
            )}
          </div>

          {/* Trusted Networks List */}
          <div>
            <div className="text-sm font-medium mb-2">Trusted Networks</div>
            <div className="space-y-2">
              {trustedSsidsQuery.data?.map((ssid: string) => (
                <div
                  key={ssid}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <span className="text-sm">{ssid}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSsidMutation.mutate(ssid)}
                    disabled={removeSsidMutation.isPending}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
              
              {trustedSsidsQuery.data?.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">
                  No trusted networks configured
                </div>
              )}
            </div>
          </div>

          {/* Add Custom Network */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter network name (SSID)"
              value={newSsid}
              onChange={(e) => setNewSsid(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustomSsid()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCustomSsid}
              disabled={!newSsid.trim() || addSsidMutation.isPending}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureFlag({
  title,
  description,
  icon,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>{title}</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              <Trans>{description}</Trans>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}
