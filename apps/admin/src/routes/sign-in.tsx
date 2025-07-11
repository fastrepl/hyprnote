import {
  Button,
  Center,
  Divider,
  Paper,
  PasswordInput,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBrandGoogle, IconLock } from "@tabler/icons-react";
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
    <Center h="100vh">
      <Paper shadow="md" p="xl" radius="md" w={400}>
        <Stack gap="lg">
          <Stack gap="xs" align="center">
            <Title order={2} ta="center">Welcome Back</Title>
            <Text c="dimmed" ta="center">Sign in to your admin account</Text>
          </Stack>

          <Tabs defaultValue="password" variant="pills">
            <Tabs.List grow>
              <Tabs.Tab value="password" leftSection={<IconLock size={16} />}>
                Password
              </Tabs.Tab>
              <Tooltip
                label="Enterprise license required"
                withArrow
                position="top"
              >
                <Tabs.Tab
                  value="sso"
                  leftSection={<IconBrandGoogle size={16} />}
                  disabled={process.env.NODE_ENV !== "development"}
                >
                  SSO
                </Tabs.Tab>
              </Tooltip>
            </Tabs.List>

            <Tabs.Panel value="password" pt="md">
              <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
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

                  <Button
                    type="submit"
                    fullWidth
                    loading={signInMutation.isPending}
                    mt="md"
                  >
                    Sign In
                  </Button>
                </Stack>
              </form>
            </Tabs.Panel>

            <Tabs.Panel value="sso" pt="md">
              <Stack gap="md">
                <Text ta="center" c="dimmed" size="sm">
                  Configure your Identity Provider (IDP) settings in the admin panel after signing in.
                </Text>
                <Button
                  fullWidth
                  variant="outline"
                  leftSection={<IconBrandGoogle size={16} />}
                  disabled
                >
                  Continue with SSO
                </Button>
              </Stack>
            </Tabs.Panel>
          </Tabs>

          <Divider />

          <Text ta="center" size="sm">
            Don't have an account?{" "}
            <Text component={Link} to="/sign-up" c="blue" td="underline">
              Sign Up
            </Text>
          </Text>
        </Stack>
      </Paper>
    </Center>
  );
}
