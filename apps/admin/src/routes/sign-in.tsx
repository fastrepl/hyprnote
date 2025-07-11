import { Button, Group, PasswordInput, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/sign-in")({
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signInMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const { error, data: response } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      return response;
    },
    onSuccess: (response) => {
      queryClient.resetQueries();
      navigate({ to: "/" });
    },
  });

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: "example@org.com",
      password: "password",
    },
    validate: {
      email: (value) => {
        if (!value) {
          return "Email is required";
        }
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Please enter a valid email address" : null;
      },
      password: (value) => (!value ? "Password is required" : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    await signInMutation.mutateAsync(values);
  };

  return (
    <div className="flex h-screen w-1/3 items-center justify-center flex-col">
      <form
        className="flex flex-col gap-2 w-full"
        onSubmit={form.onSubmit(handleSubmit)}
      >
        <TextInput
          withAsterisk
          label="Email"
          placeholder="your@email.com"
          type="email"
          key={form.key("email")}
          {...form.getInputProps("email")}
        />

        <PasswordInput
          withAsterisk
          label="Password"
          placeholder="Enter your password"
          key={form.key("password")}
          {...form.getInputProps("password")}
        />

        <Group justify="flex-end" mt="md">
          <Button type="submit" loading={signInMutation.isPending}>
            Sign In
          </Button>
        </Group>
      </form>

      <small>
        <Link to="/sign-up" className="group">
          Don't have an account? <span className="underline group-hover:no-underline">Sign Up</span>
        </Link>
      </small>
    </div>
  );
}
