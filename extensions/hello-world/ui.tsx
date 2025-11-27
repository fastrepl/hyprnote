import { useState } from "react";

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
  const [count, setCount] = useState(0);

  const handleGreet = () => {
    setGreeting(`Hello from ${extensionId}!`);
  };

  const handleIncrement = () => {
    setCount((prev) => prev + 1);
  };

  return (
    <div className="p-4 h-full">
      <Card>
        <CardHeader>
          <CardTitle>Hello World Extension</CardTitle>
          <CardDescription>
            A minimal example extension using @hypr/ui components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {greeting && <p className="text-sm text-neutral-600">{greeting}</p>}
            <p className="text-sm">
              Counter: <span className="font-semibold">{count}</span>
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex gap-2">
            <Button onClick={handleGreet} variant="default">
              Say Hello
            </Button>
            <Button onClick={handleIncrement} variant="outline">
              Increment
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
