import {
  Button,
  Center,
  LoadingOverlay,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";

import { authClient } from "@/lib/auth/client";
import { adminCreated } from "@/services/auth.api";
import { getEnv } from "@/services/env.api";

export const Route = createFileRoute("/login")({
  component: Component,
  beforeLoad: async ({ context: { userSession } }) => {
    if (userSession) {
      return redirect({ to: "/app" });
    }
  },
  loader: async () => {
    const [baseUrl, adminEmail, orgSlug] = await Promise.all([
      getEnv({ data: { key: "VITE_BASE_URL" } }),
      getEnv({ data: { key: "ADMIN_EMAIL" } }),
      getEnv({ data: { key: "ORG_SLUG" } }),
    ]) as [string, string, string];

    return { baseUrl, adminEmail, orgSlug };
  },
});

function Component() {
  const { baseUrl, adminEmail, orgSlug } = Route.useLoaderData();

  const adminCreatedQuery = useQuery({
    queryKey: ["adminCreated"],
    queryFn: () => adminCreated(),
  });

  if (adminCreatedQuery.isLoading) {
    return <LoadingOverlay visible={true} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />;
  }

  return adminCreatedQuery.data
    ? (
      <Container title="Sign In" description="Sign in to your account">
        <PasswordSignInForm />
      </Container>
    )
    : (
      <Container title="Admin Sign Up" description="Admin can invite other members to join">
        <PasswordAdminSignUpForm
          baseUrl={baseUrl}
          adminEmail={adminEmail}
          orgSlug={orgSlug}
        />
      </Container>
    );
}

function PasswordAdminSignUpForm(
  { baseUrl, adminEmail, orgSlug }: { baseUrl: string; adminEmail: string; orgSlug: string },
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signUpMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const { error, data: response } = await authClient.signUp.email({
        name: data.email,
        ...data,
      });

      if (error) {
        throw error;
      }

      const { error: orgError } = await authClient.organization.create({
        name: orgSlug,
        slug: orgSlug,
        userId: response?.user.id,
        keepCurrentActiveOrganization: false,
      });

      if (orgError) {
        throw orgError;
      }

      return response;
    },
    onError: (error) => {
      if (error.message) {
        form.setFieldError("email", error.message);
      } else {
        form.setFieldError("email", `${baseUrl} seems to be an invalid base URL.`);
      }
    },
    onSuccess: (response) => {
      queryClient.resetQueries();
      navigate({ to: "/app" });
    },
  });

  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    passwordConfirm: z.string().min(1),
  })
    .refine((data) => data.password === data.passwordConfirm, {
      message: "Passwords do not match",
      path: ["passwordConfirm"],
    })
    .refine((data) => data.email === adminEmail, {
      message: "This is different from admin email",
      path: ["email"],
    });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    mode: "uncontrolled",
    validate: zodResolver(schema),
  });

  const handleSubmit = (values: FormData) => {
    signUpMutation.mutate(values);
  };

  return (
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

        <PasswordInput
          withAsterisk
          label="Confirm Password"
          placeholder="Confirm your password"
          key={form.key("passwordConfirm")}
          {...form.getInputProps("passwordConfirm")}
        />
        <Button
          type="submit"
          fullWidth
          loading={signUpMutation.isPending}
          mt="md"
        >
          Sign Up
        </Button>
      </Stack>
    </form>
  );
}

function PasswordSignInForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signInMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const { error, data: response } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (error) {
        throw error;
      }

      return response;
    },
    onError: (error) => {
      form.setFieldError("email", error.message);
    },
    onSuccess: (response) => {
      queryClient.resetQueries();
      navigate({ to: "/app" });
    },
  });

  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    mode: "uncontrolled",
    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: FormData) => {
    await signInMutation.mutateAsync(values);
  };

  return (
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
  );
}

function Container(
  { title, children, description }: { title: string; description: string; children: React.ReactNode },
) {
  return (
    <Center h="100vh">
      <Paper shadow="md" p="xl" radius="md" w={400}>
        <Stack gap="lg">
          <Stack gap="xs" align="center">
            <Title order={2} ta="center">{title}</Title>
            <Text c="dimmed" ta="center">{description}</Text>
          </Stack>
          <Tabs defaultValue="password" variant="pills">
            <Tabs.List grow>
              <Tabs.Tab value="password" leftSection={<IconLock size={16} />}>
                Email & Password
              </Tabs.Tab>
              <Tooltip
                label="Enterprise license required"
                withArrow
                position="top"
              >
                <Tabs.Tab
                  value="sso"
                  leftSection={<IconBrandGoogle size={16} />}
                  disabled={true}
                >
                  Single Sign On
                </Tabs.Tab>
              </Tooltip>
            </Tabs.List>

            <Tabs.Panel value="password" pt="md">
              {children}
            </Tabs.Panel>

            <Tabs.Panel value="sso" pt="md">
              <div>TODO</div>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Paper>
    </Center>
  );
}
