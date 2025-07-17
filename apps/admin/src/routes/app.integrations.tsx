import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  Transition,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconBuilding, IconCheck, IconMist, IconPlus, IconTrash, IconUser } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";

import { getUserRole } from "@/services/auth.api";
import { deleteLlmProvider, insertLlmProvider, listLlmProvider } from "@/services/provider.api";

export const Route = createFileRoute("/app/integrations")({
  validateSearch: z.object({
    tab: z.enum(["personal", "organization"]).default("personal"),
  }),
  loaderDeps: ({ search: { tab } }) => ({ tab }),
  loader: async ({ deps: { tab } }) => {
    const role = await getUserRole();
    const isAdmin = role === "owner";

    if (!isAdmin && tab === "organization") {
      throw redirect({ to: "/app/settings", search: { tab: "personal" } });
    }

    return { tab, role, isAdmin };
  },
  component: Component,
});

function Component() {
  const { tab, isAdmin } = Route.useLoaderData();

  const navigate = useNavigate();

  const handleTabChange = (value: string | null) => {
    if (value !== "personal" && value !== "organization") {
      return;
    }

    navigate({
      to: "/app/integrations",
      search: { tab: value },
    });
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>
          Integrations
        </Title>
        <Text c="dimmed" size="sm">
          Manage your AI providers and their configurations
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
          <Tabs.Tab value="organization" leftSection={<IconBuilding size={16} />} disabled={!isAdmin}>
            Organization
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="personal" className="mt-6">
          <Card withBorder p="lg" radius="md">
            There's no personal-level integrations yet
          </Card>
        </Tabs.Panel>
        <Tabs.Panel value="organization" className="mt-6">
          <SettingsSection type="organization" />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function SettingsSection({ type }: { type: "personal" | "organization" }) {
  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconMist size={20} />
          <Title order={4}>Integrations</Title>
        </Group>
        <NewProviderModal type={type} variant="default" />
      </Group>
      <ProvidersTable type={type} />
    </Paper>
  );
}

function ProvidersTable({ type }: { type: "personal" | "organization" }) {
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const rows = await listLlmProvider();
      return rows;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const rows = await deleteLlmProvider({ data: { id } });
      return rows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
    onError: console.error,
  });

  return (
    <Box pos="relative">
      <LoadingOverlay visible={isLoading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

      {providers?.length === 0
        ? (
          <Center py="xl">
            <Stack align="center" gap="md">
              <IconMist size={48} color="var(--mantine-color-gray-5)" />
              <Stack align="center" gap="xs">
                <Text size="lg" fw={500}>
                  No integrations configured
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Get started by adding your first integration
                </Text>
              </Stack>
              <NewProviderModal type="personal" variant="default" />
            </Stack>
          </Center>
        )
        : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Model</Table.Th>
                <Table.Th>Base URL</Table.Th>
                <Table.Th>API Key</Table.Th>
                <Table.Th w={80}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {providers?.map((provider) => (
                <Table.Tr key={provider.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Text fw={500}>{provider.name}</Text>
                      <Badge size="xs" variant="light" color="blue">
                        LLM
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{provider.model}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {provider.baseUrl}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {provider.apiKey ? "••••••••" : "Not set"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Delete provider">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => deleteMutation.mutate(provider.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
    </Box>
  );
}

function NewProviderModal({ type, variant }: { type: "personal" | "organization"; variant: "default" | "light" }) {
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();

  const schema = z.object({
    type: z.enum(["llm", "stt", "salesforce"]),
    name: z.string().min(1, "Name is required").max(20, "Name too long"),
    model: z.string().min(1, "Model is required").max(100, "Model name too long"),
    baseUrl: z.string().url("Invalid URL"),
    apiKey: z.string().min(1, "API Key is required"),
  });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    mode: "uncontrolled",
    validate: zodResolver(schema),
    initialValues: {
      type: "llm" as const,
      name: "",
      model: "",
      baseUrl: "",
      apiKey: "",
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (values: FormData) => {
      // Simulate validation (replace with actual validation logic)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const rows = await insertLlmProvider({ data: values });
      return rows;
    },
    onMutate: () => {
      return { startedAt: Date.now() };
    },
    onSuccess: (data, variables, { startedAt }) => {
      const duration = Math.min(2000, Math.max(1000, 3000 - (Date.now() - startedAt)));

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["providers"] });
        form.reset();
        close();
      }, duration);
    },
    onError: (error) => {
      if (error.message) {
        form.setFieldError("name", error.message);
      }
    },
  });

  const handleSubmit = (values: FormData) => {
    insertMutation.mutate(values);
  };

  return (
    <>
      <Button
        variant={variant}
        disabled={insertMutation.isPending}
        onClick={open}
      >
        <IconPlus size={16} />
      </Button>
      <Modal
        opened={opened}
        onClose={close}
        title="Add new integration"
        centered
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Select
              label="Type"
              placeholder="Select integration type"
              description="Choose the type of integration"
              required
              data={[
                { value: "llm", label: "LLM (OpenAI compatible)" },
                { value: "stt", label: "STT (Speech-to-Text) - Coming Soon", disabled: true },
                { value: "salesforce", label: "Salesforce - Coming Soon", disabled: true },
              ]}
              {...form.getInputProps("type")}
            />
            <TextInput
              label="Provider Name"
              placeholder="bedrock_openai"
              description="Unique identifier for this integration"
              required
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Model"
              placeholder="gpt-4o"
              description="The specific model to use (e.g., 'gpt-4o', 'claude-4-sonnet')"
              required
              {...form.getInputProps("model")}
            />
            <TextInput
              label="Base URL"
              placeholder="https://api.openai.com/v1"
              description="OpenAI compatible API endpoint"
              required
              {...form.getInputProps("baseUrl")}
            />
            <PasswordInput
              label="API Key"
              placeholder="Your API key"
              description="The authentication key for the provider's API"
              required
              {...form.getInputProps("apiKey")}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={insertMutation.isPending}
                disabled={insertMutation.isPending || insertMutation.isSuccess}
                leftSection={
                  <Transition mounted={insertMutation.isSuccess} transition="scale" duration={400}>
                    {(styles) => (
                      <Box style={styles}>
                        <IconCheck size={16} />
                      </Box>
                    )}
                  </Transition>
                }
              >
                {insertMutation.isSuccess ? "Success!" : insertMutation.isPending ? "Validating..." : "Add Integration"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
