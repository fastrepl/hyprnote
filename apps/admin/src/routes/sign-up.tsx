import { Alert, Button, Center, Divider, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconInfoCircle, IconShield } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { envServerSchema } from "@/env";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/sign-up")({
  component: Component,
  loader: () => {
    return { ADMIN_EMAIL: envServerSchema.ADMIN_EMAIL };
  },
});

function Component() {
  const { ADMIN_EMAIL } = Route.useLoaderData();
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
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Please enter a valid email address";
        }
        if (value !== ADMIN_EMAIL) {
          return "Only the admin email can create the first account. This is an invite-only system.";
        }
        return null;
      },
      password: (value) => {
        if (!value) {
          return "Password is required";
        }
        if (value.length < 8) {
          return "Password must be at least 8 characters";
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
        }
        return null;
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
    <Center h="100vh">
      <Paper shadow="md" p="xl" radius="md" w={420}>
        <Stack gap="lg">
          <Stack gap="xs" align="center">
            <IconShield size={48} color="blue" />
            <Title order={2} ta="center">Create Admin Account</Title>
            <Text c="dimmed" ta="center" size="sm">
              Set up the administrative account for your organization
            </Text>
          </Stack>

          <Alert
            icon={<IconInfoCircle size={16} />}
            title="Admin Only Registration"
            color="blue"
            variant="light"
          >
            Only the configured admin email ({ADMIN_EMAIL}) can create the first account. This ensures secure
            initialization of your admin panel.
          </Alert>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
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
                placeholder={ADMIN_EMAIL}
                type="email"
                key={form.key("email")}
                {...form.getInputProps("email")}
                description="Must match the configured admin email"
              />

              <PasswordInput
                withAsterisk
                label="Password"
                placeholder="Enter your password"
                key={form.key("password")}
                {...form.getInputProps("password")}
                description="At least 8 characters with uppercase, lowercase, and number"
              />

              <PasswordInput
                withAsterisk
                label="Confirm Password"
                placeholder="Confirm your password"
                key={form.key("confirmPassword")}
                {...form.getInputProps("confirmPassword")}
              />

              <Button
                type="submit"
                fullWidth
                loading={signUpMutation.isPending}
                mt="md"
                size="md"
              >
                Create Admin Account
              </Button>
            </Stack>
          </form>

          <Divider />

          <Text ta="center" size="sm">
            Already have an account?{" "}
            <Text component={Link} to="/sign-in" c="blue" td="underline">
              Sign In
            </Text>
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
