import {
  Accordion,
  Alert,
  Button,
  Code,
  CopyButton,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconCopy, IconInfoCircle, IconKey, IconRefresh, IconSettings } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { ReactNode, useState } from "react";

export const Route = createFileRoute("/app/settings")({
  component: Component,
  loader: ({ context }) => {
    const email = context.userSession?.user.email;
    return { email };
  },
});

interface ApiKeySettings {
  token: string;
  createdAt: string;
}

interface GeneralSettings {
  email: string;
}

interface SettingsSectionConfig {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
  content: () => ReactNode;
}

interface SettingsSectionProps {
  config: SettingsSectionConfig;
}

function SettingsSection({ config }: SettingsSectionProps) {
  return (
    <Accordion.Item value={config.key}>
      <Accordion.Control icon={config.icon}>
        <div>
          <Text fw={500}>{config.title}</Text>
          <Text size="sm" c="dimmed">
            {config.description}
          </Text>
        </div>
      </Accordion.Control>
      <Accordion.Panel>{config.content()}</Accordion.Panel>
    </Accordion.Item>
  );
}

function generateToken() {
  return `hyprnote_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
}

function Component() {
  const { email } = Route.useLoaderData();

  const [apiKey, setApiKey] = useState<ApiKeySettings>(() => ({
    token: generateToken(),
    createdAt: new Date().toISOString().split("T")[0],
  }));

  const generalForm = useForm<GeneralSettings>({
    initialValues: {
      email: email ?? "",
    },
  });

  const handleRegenerateApiKey = () => {
    const newApiKey: ApiKeySettings = {
      token: generateToken(),
      createdAt: new Date().toISOString().split("T")[0],
    };

    setApiKey(newApiKey);

    notifications.show({
      title: "API Key Regenerated",
      message: "Your API key has been regenerated successfully",
      color: "green",
      icon: <IconCheck size={16} />,
    });
  };

  const renderApiKeyContent = () => (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" radius="md">
        This API key provides access to your HyprNote instance. Keep it secure and regenerate if compromised.
      </Alert>

      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
            <Code className="flex-1">
              {apiKey.token}
            </Code>
          </Group>

          <Group gap="xs" style={{ flexShrink: 0 }}>
            <CopyButton value={apiKey.token}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copied!" : "Copy API key"}>
                  <Button
                    variant={copied ? "filled" : "light"}
                    color="blue"
                    onClick={copy}
                    size="sm"
                    radius="md"
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </Button>
                </Tooltip>
              )}
            </CopyButton>

            <Button
              variant="subtle"
              color="dark"
              onClick={handleRegenerateApiKey}
              size="sm"
              radius="md"
            >
              <IconRefresh size={16} />
            </Button>
          </Group>
        </Group>
      </Paper>
    </Stack>
  );

  const renderGeneralContent = () => (
    <form onSubmit={generalForm.onSubmit(() => {})}>
      <Stack gap="md">
        <TextInput
          label="Email"
          disabled
          {...generalForm.getInputProps("email")}
        />
      </Stack>
    </form>
  );

  const settingsSections: SettingsSectionConfig[] = [
    {
      key: "general",
      icon: <IconSettings size={20} />,
      title: "General Settings",
      description: "General settings for your account",
      content: renderGeneralContent,
    },
    {
      key: "api-key",
      icon: <IconKey size={20} />,
      title: "API Key",
      description: "Personal API key for connecting Hyprnote desktop app",
      content: renderApiKeyContent,
    },
  ];

  return (
    <Stack gap="xl">
      <div>
        <Title order={1} mb="xs">
          Settings
        </Title>
        <Text c="dimmed" size="sm">
          Manage your application configuration and API access
        </Text>
      </div>

      <Accordion defaultValue={null} variant="separated">
        {settingsSections.map((section) => <SettingsSection key={section.key} config={section} />)}
      </Accordion>
    </Stack>
  );
}
