import { Button, Group, PasswordInput, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/sign-up")({
  component: Component,
});

function Component() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signUpMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const { error, data: response } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
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
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      name: (value) => (!value?.trim() ? "Name is required" : null),
      email: (value) => {
        if (!value) {
          return "Email is required";
        }
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Please enter a valid email address" : null;
      },
      password: (value) => {
        if (!value) {
          return "Password is required";
        }
        return value.length < 8 ? "Password must be at least 8 characters" : null;
      },
      confirmPassword: (value, values) => {
        if (!value) {
          return "Please confirm your password";
        }
        return value !== values.password ? "Passwords do not match" : null;
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    await signUpMutation.mutateAsync({
      name: values.name,
      email: values.email,
      password: values.password,
    });
  };

  return (
    <div className="flex h-screen w-1/3 items-center justify-center flex-col">
      <form
        className="flex flex-col gap-2 w-full"
        onSubmit={form.onSubmit(handleSubmit)}
      >
        <TextInput
          withAsterisk
          label="Full Name"
          placeholder="Enter your full name"
          key={form.key("name")}
          {...form.getInputProps("name")}
        />

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

        <PasswordInput
          withAsterisk
          label="Confirm Password"
          placeholder="Confirm your password"
          key={form.key("confirmPassword")}
          {...form.getInputProps("confirmPassword")}
        />

        <Group justify="flex-end" mt="md">
          <Button type="submit" loading={signUpMutation.isPending}>
            Sign Up
          </Button>
        </Group>
      </form>

      <small>
        <Link to="/sign-in" className="group">
          Already have an account? <span className="underline group-hover:no-underline">Sign In</span>
        </Link>
      </small>
    </div>
  );
}
