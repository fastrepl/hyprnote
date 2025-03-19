import {
  type ErrorRouteComponent,
  Link,
  type NotFoundError,
  type NotFoundRouteComponent,
} from "@tanstack/react-router";

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

export const ErrorComponent: ErrorRouteComponent = (props) => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>Error</p>
      <pre>{JSON.stringify(props.error, null, 2)}</pre>
      <Link to="/app">Go to home</Link>
    </div>
  );
};
