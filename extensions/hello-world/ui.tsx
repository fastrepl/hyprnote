import { useState } from "react";
import { useRow, useSetRowCallback, useStore } from "tinybase/ui-react";

import { Button } from "@hypr/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@hypr/ui/components/ui/card";

export interface ExtensionViewProps {
  extensionId: string;
  state?: Record<string, unknown>;
}

export default function HelloWorldExtensionView({
  extensionId,
}: ExtensionViewProps) {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [localCount, setLocalCount] = useState(0);

  const store = useStore();
  const extensionState = useRow("extension_state", extensionId) as {
    counter?: number;
    last_updated?: string;
  };

  const setExtensionState = useSetRowCallback(
    "extension_state",
    extensionId,
    (newState: { counter: number; last_updated: string }) => newState,
    [],
  );

  const handleGreet = () => {
    setGreeting(`Hello from ${extensionId}!`);
  };

  const handleIncrementLocal = () => {
    setLocalCount((prev) => prev + 1);
  };

  const handleIncrementSynced = () => {
    const currentCounter = extensionState?.counter ?? 0;
    setExtensionState({
      counter: currentCounter + 1,
      last_updated: new Date().toISOString(),
    });
  };

  const syncedCounter = extensionState?.counter ?? 0;
  const lastUpdated = extensionState?.last_updated;
  const storeConnected = !!store;

  return (
    <div className="p-4 h-full">
      <Card>
        <CardHeader>
          <CardTitle>Hello World Extension</CardTitle>
          <CardDescription>
            Extension with TinyBase store sync (iframe isolated)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {greeting && <p className="text-sm text-neutral-600">{greeting}</p>}

            <div className="p-3 bg-neutral-50 rounded-lg space-y-2">
              <p className="text-xs font-medium text-neutral-500 uppercase">
                Store Status
              </p>
              <p className="text-sm">
                Connected:{" "}
                <span
                  className={`font-semibold ${storeConnected ? "text-green-600" : "text-red-600"}`}
                >
                  {storeConnected ? "Yes" : "No"}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-600 uppercase mb-1">
                  Local Counter
                </p>
                <p className="text-2xl font-bold text-blue-700">{localCount}</p>
                <p className="text-xs text-blue-500 mt-1">
                  Not synced (iframe only)
                </p>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs font-medium text-green-600 uppercase mb-1">
                  Synced Counter
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {syncedCounter}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  {lastUpdated
                    ? `Updated: ${new Date(lastUpdated).toLocaleTimeString()}`
                    : "Via TinyBase store"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGreet} variant="default" size="sm">
              Say Hello
            </Button>
            <Button onClick={handleIncrementLocal} variant="outline" size="sm">
              Local +1
            </Button>
            <Button
              onClick={handleIncrementSynced}
              variant="outline"
              size="sm"
              className="bg-green-50 hover:bg-green-100 border-green-200"
            >
              Synced +1
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
