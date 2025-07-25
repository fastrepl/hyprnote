import {
  ActionIcon,
  Alert,
  Button,
  Card,
  CopyButton,
  Group,
  LoadingOverlay,
  Modal,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconBuilding,
  IconCheck,
  IconCopy,
  IconDeviceIpadHorizontalPin,
  IconHelp,
  IconInfoCircle,
  IconKey,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "mantine-form-zod-resolver";
import { ReactNode, useEffect } from "react";
import { z } from "zod";

import { getActiveOrganizationFull, getUserRole } from "@/services/auth.api";
import { getOrganizationConfig, upsertOrganizationConfig } from "@/services/config.api";
import { createApiKey, deleteApiKeys, listApiKey } from "@/services/key.api";
import { listLlmProvider } from "@/services/provider.api";

export const Route = createFileRoute("/app/settings")({
  validateSearch: z.object({
    tab: z.enum(["personal", "organization"]).default("personal"),
  }),
  component: Component,
  loaderDeps: ({ search: { tab } }) => ({ tab }),
  loader: async ({ context: { userSession }, deps: { tab } }) => {
    const [org, role] = await Promise.all([
      getActiveOrganizationFull(),
      getUserRole(),
    ]);

    if (!org) {
      throw redirect({ to: "/login" });
    }

    const isAdmin = role === "owner";

    if (!isAdmin && tab === "organization") {
      throw redirect({ to: "/app/settings", search: { tab: "personal" } });
    }

    const email = userSession?.user.email;
    return { email, role, isAdmin, slug: org.slug };
  },
});

function Component() {
  const { email, isAdmin, slug } = Route.useLoaderData();
  const { tab } = Route.useSearch();

  const navigate = useNavigate();

  const handleTabChange = (value: string | null) => {
    if (value !== "personal" && value !== "organization") {
      return;
    }

    navigate({
      to: "/app/settings",
      search: { tab: value },
    });
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>
          Settings
        </Title>
        <Text c="dimmed" size="sm">
          Manage your application configuration and API access
        </Text>
      </div>

      <Tabs
        defaultValue={tab ?? "personal"}
        onChange={(value) => handleTabChange(value)}
        className="mt-4"
      >
        <Tabs.List>
          <Tabs.Tab value="personal" leftSection={<IconUser size={16} />}>
            Personal
          </Tabs.Tab>
          <Tabs.Tab
            disabled={!isAdmin}
            value="organization"
            leftSection={<IconBuilding size={16} />}
          >
            Organization
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="personal" className="mt-6">
          <PersonalSettings email={email} />
        </Tabs.Panel>
        <Tabs.Panel value="organization" className="mt-6">
          <OrganizationSettings slug={slug} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function PersonalSettings({ email }: { email: string | undefined }) {
  const [opened, handler] = useDisclosure(false);

  const integratiosn = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const integrations = await listLlmProvider();
      return integrations;
    },
  });

  const baseUrl = useQuery({
    queryKey: ["organizationConfig", "baseUrl"],
    queryFn: async () => {
      const config = await getOrganizationConfig();
      return config?.baseUrl ?? "";
    },
  });

  const existingApiKeys = useQuery({
    queryKey: ["apiKey"],
    queryFn: async () => {
      const keys = await listApiKey();
      if (!keys?.length) {
        return null;
      }
      return keys.map((key) => key.id);
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async () => {
      console.log("createApiKeyMutation");
      const apiKey = await createApiKey();
      return apiKey?.key;
    },
    onSuccess: async () => {
      const ids = existingApiKeys.data;
      if (ids?.length) {
        await deleteApiKeys({ data: { ids } });
      }

      handler.open();
    },
  });

  return (
    <Stack gap="lg">
      <SettingsSection
        icon={<IconSettings size={20} />}
        title="General"
      >
        <Stack gap="md">
          <TextInput disabled label="Email Address" value={email} />
        </Stack>
      </SettingsSection>

      <SettingsSection
        icon={<IconDeviceIpadHorizontalPin size={20} />}
        title="Client Connection"
      >
        {baseUrl.isPending
          ? <LoadingOverlay visible />
          : !baseUrl.data
          ? (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              <Text size="sm">
                Base URL is not set.
              </Text>
            </Alert>
          )
          : integratiosn.isPending
          ? <LoadingOverlay visible />
          : !integratiosn.data?.length
          ? (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              <Text size="sm">
                No integrations configured.
              </Text>
            </Alert>
          )
          : existingApiKeys.isPending
          ? <LoadingOverlay visible />
          : existingApiKeys.data?.length
          ? (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
            >
              <Text size="sm">
                Starting connection helper will invalidate the existing API key.
              </Text>
            </Alert>
          )
          : (
            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
            >
              <Text size="sm">
                Start connection helper to create an API key.
              </Text>
            </Alert>
          )}
        <Button
          onClick={() => createApiKeyMutation.mutate()}
          variant="light"
          size="md"
        >
          Start Connection Helper
        </Button>
        {(createApiKeyMutation.data) && (
          <ClientConnectionHelperModal
            opened={opened}
            handler={handler}
            baseUrl={baseUrl.data ?? ""}
            apiKey={createApiKeyMutation.data}
          />
        )}
      </SettingsSection>
    </Stack>
  );
}

function ClientConnectionHelperModal({
  opened,
  handler,
  baseUrl,
  apiKey,
}: {
  opened: boolean;
  handler: { open: () => void; close: () => void };
  baseUrl: string;
  apiKey: string;
}) {
  // should match with deeplink.rs
  const deeplink = `hypr://hyprnote.com/register?baseUrl=${baseUrl}&apiKey=${apiKey}`;

  return (
    <Modal
      centered
      opened={opened}
      onClose={handler.close}
      title="Client Connection Help"
      size="md"
    >
      <Stack gap="lg">
        <Stack gap="sm">
          <Text size="md" fw={500}>
            Method 1. Auto-Connect using deep-link
          </Text>
          <Button
            onClick={() => window.open(deeplink, "_blank")}
            size="sm"
            radius="md"
          >
            Click here to auto-connect
          </Button>
        </Stack>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            Try Method 1 first. If it doesn't work, try Method 2.
          </Text>
        </Alert>

        <Stack gap="sm">
          <Text size="md" fw={500}>
            Method 2. Manual connect
          </Text>

          <Group gap="md" grow>
            <CopyButton value={baseUrl}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied!" : "Copy Base URL"}>
                  <Button
                    variant={copied ? "filled" : "light"}
                    color="blue"
                    onClick={copy}
                    leftSection={<p>Base URL</p>}
                    size="sm"
                    radius="md"
                    flex={1}
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
            <CopyButton value={apiKey}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied!" : "Copy API key"}>
                  <Button
                    variant={copied ? "filled" : "light"}
                    color="blue"
                    onClick={copy}
                    leftSection={<p>API Key</p>}
                    size="sm"
                    radius="md"
                    flex={1}
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>
          </Group>

          <Stack gap="xs" pl="sm">
            <Text fw={500} size="sm">Desktop App Setup:</Text>
            <Text size="sm">
              1. Open the Hyprnote desktop app
            </Text>
            <Text size="sm">
              2. Go to Settings → Account
            </Text>
            <Text size="sm">
              3. Paste your Base URL and API key
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </Modal>
  );
}

function OrganizationSettings({ slug }: { slug: string }) {
  const existingConfigQuery = useQuery({
    queryKey: ["organizationConfig", "baseUrl"],
    queryFn: async () => {
      const config = await getOrganizationConfig();
      return config?.baseUrl ?? "";
    },
  });

  const upsertConfigMutation = useMutation({
    mutationFn: async (data: { baseUrl: string }) => {
      const config = await upsertOrganizationConfig({ data });
      return config;
    },
    onSuccess: () => {
      existingConfigQuery.refetch();
    },
  });

  const schema = z.object({
    baseUrl: z.string().url(),
  });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    mode: "uncontrolled",
    validate: zodResolver(schema),
    initialValues: {
      baseUrl: "",
    },
    onValuesChange: (values) => {
      const validation = form.validate();
      if (validation.hasErrors === false) {
        handleSubmit(values);
      }
    },
  });

  const handleSubmit = (values: FormData) => {
    upsertConfigMutation.mutate(values);
  };

  useEffect(() => {
    if (!existingConfigQuery.data) {
      return;
    }

    form.initialize({ baseUrl: existingConfigQuery.data });
  }, [existingConfigQuery.data]);

  return (
    <Stack gap="lg">
      <SettingsSection
        icon={<IconSettings size={20} />}
        title="General"
      >
        {existingConfigQuery.isPending
          ? <LoadingOverlay visible />
          : (
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  label="Organization Slug"
                  value={slug}
                  disabled
                />

                <TextInput
                  label="Base URL"
                  placeholder={`e.g. ${window.location.origin}`}
                  {...form.getInputProps("baseUrl")}
                />
              </Stack>
            </form>
          )}
      </SettingsSection>

      <SettingsSection
        icon={<IconKey size={20} />}
        title="License"
        helper={<LicenseHelperModal />}
      >
        <Stack gap="md">
          <TextInput
            label="Hyprnote Admin Server License"
            placeholder="Not available at the moment"
            disabled
          />
        </Stack>
      </SettingsSection>
    </Stack>
  );
}

function LicenseHelperModal() {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <ActionIcon
        variant="subtle"
        color="blue"
        size="sm"
        onClick={open}
      >
        <IconHelp size={16} />
      </ActionIcon>
      <Modal
        centered
        opened={opened}
        onClose={close}
        title="License Helper"
        size="md"
      >
        <Stack gap="lg">
          <Text size="sm">
            Some features of Hyprnote Admin Server are only available with an <b>enterprise license</b>.
          </Text>

          <Text size="sm">
            Nothing is gated <b>at the moment</b> since we're still in beta.
          </Text>

          <Button
            variant="light"
            size="sm"
            onClick={() => window.open("https://docs.hyprnote.com/hyprnote-admin-server/overview", "_blank")}
          >
            Read Documentation
          </Button>
        </Stack>
      </Modal>
    </>
  );
}

function SettingsSection({
  icon,
  title,
  children,
  helper,
  gap = "lg",
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  helper?: ReactNode;
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  return (
    <Card withBorder>
      <Stack gap={gap}>
        {helper
          ? (
            <Group gap="xs" align="center">
              <Title order={3} className="flex items-center gap-2 mb-4">
                {icon}
                {title}
              </Title>
              {helper}
            </Group>
          )
          : (
            <Title order={3} className="flex items-center gap-2 mb-4">
              {icon}
              {title}
            </Title>
          )}
        {children}
      </Stack>
    </Card>
  );
}
