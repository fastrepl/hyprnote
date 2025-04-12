import * as Sentry from "@sentry/react";
import {
  type ErrorRouteComponent,
  Link,
  type NotFoundError,
  type NotFoundRouteComponent,
} from "@tanstack/react-router";
import { open } from "@tauri-apps/plugin-shell";
import { useEffect } from "react";

import { Button } from "@hypr/ui/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 min-h-screen h-full w-full">
      <p>Oops! Nothing here.</p>
      <Link to="/app">
        <Button variant="outline">Go to home</Button>
      </Link>
    </div>
  );
};

export const CatchNotFoundFallback = (_props: { error: NotFoundError }) => {
  return <NotFound />;
};

export const NotFoundComponent: NotFoundRouteComponent = (_props) => {
  return <NotFound />;
};

export const ErrorComponent: ErrorRouteComponent = ({ error }) => {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen h-full w-full flex-col items-center justify-center gap-2 bg-neutral-200 p-6">
      <p className="text-xl font-semibold">Sorry, something went wrong.</p>
      <p>The error has been automatically reported to the team.</p>
      <img src="/assets/sorry.png" alt="error" className="w-1/2" />

      <div className="flex gap-2">
        <Link to="/app/new">
          <Button variant="ghost">Back to home</Button>
        </Link>
        <Button variant="ghost" onClick={() => open("https://hyprnote.com/discord")}>
          Join Discord
        </Button>
        <Button variant="ghost" onClick={() => open("https://github.com/fastrepl/hyprnote/issues")}>
          Open Issue
        </Button>
      </div>
    </div>
  );
};
