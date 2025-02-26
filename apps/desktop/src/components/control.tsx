import { Button } from "@hypr/ui/components/ui/button";
import {
  Link,
  type NotFoundRouteComponent,
  type ErrorRouteComponent,
  type NotFoundError,
} from "@tanstack/react-router";

const NotFound = () => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <p>Oops! Nothing here.</p>
        <Link to="/app">
          <Button variant="outline">Go to home</Button>
        </Link>
      </div>
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
  console.log("error", props);
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>Error</p>
      <pre>{JSON.stringify(props.error, null, 2)}</pre>
      <Link to="/app">Go to home</Link>
    </div>
  );
};
