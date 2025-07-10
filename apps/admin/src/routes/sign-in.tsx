import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in")({
  component: Component,
});

function Component() {
  return (
    <div className="flex h-screen items-center justify-center">
      Sign In

      <small>
        <Link to="/sign-up" className="group">
          Don't have an account? <span className="underline group-hover:no-underline">Sign Up</span>
        </Link>
      </small>
    </div>
  );
}
