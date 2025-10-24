import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const validateSearch = z.object({
  type: z.enum(["signup", "signin"]).default("signup"),
});

export const Route = createFileRoute("/_view/_layout/app/auth")({
  validateSearch,
  component: Component,
});

function Component() {
  const { type } = Route.useSearch();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-50">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          Sign {type === "signup" ? "up" : "in"}
        </h1>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <input
                type="email"
                placeholder="Email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <input
                type="password"
                placeholder="Password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="w-full px-4 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            )}
          </form.Field>
          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign {type === "signup" ? "up" : "in"}
          </button>
        </form>
      </div>
    </div>
  );
}
