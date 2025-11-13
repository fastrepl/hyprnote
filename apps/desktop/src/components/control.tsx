import {
  type ErrorRouteComponent,
  NotFoundRouteComponent,
  useNavigate,
} from "@tanstack/react-router";

import { Button } from "@hypr/ui/components/ui/button";

export const ErrorComponent: ErrorRouteComponent = ({ error, reset }) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || "An unexpected error occurred"}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button size="sm" onClick={() => reset()}>
            Try again
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ to: "/app/main" })}
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NotFoundComponent: NotFoundRouteComponent = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <p className="text-sm text-muted-foreground">Page not found</p>
        </div>
        <Button size="sm" onClick={() => navigate({ to: "/app/main" })}>
          Go home
        </Button>
      </div>
    </div>
  );
};
