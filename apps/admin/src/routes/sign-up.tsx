import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up")({
  component: Component,
});

function Component() {
  return (
    <div className="flex h-screen items-center justify-center">
      Sign Up

      <small>
        <Link to="/sign-in" className="group">
          Do you already have an account? <span className="underline group-hover:no-underline">Sign In</span>
        </Link>
      </small>
    </div>
  );
}
