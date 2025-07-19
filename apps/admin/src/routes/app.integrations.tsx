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
import { IconBuilding, IconCheck, IconMist, IconPencil, IconPlus, IconTrash, IconUser } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "mantine-form-zod-resolver";
import { useEffect, useState } from "react";
import { z } from "zod";

import { getUserRole } from "@/services/auth.api";
import { deleteLlmProvider, insertLlmProvider, listLlmProvider, updateLlmProvider } from "@/services/provider.api";

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
  const [editingProvider, setEditingProvider] = useState<any>(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: () => listLlmProvider(),
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
                <Table.Th>Type</Table.Th>
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
                    <Badge size="xs" variant="light" color="blue">
                      LLM
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{provider.name}</Text>
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
                      <Tooltip label="Delete integration">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => deleteMutation.mutate(provider.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Edit integration">
                        <ActionIcon
                          variant="subtle"
                          color="orange"
                          size="sm"
                          onClick={() => setEditingProvider(provider)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      {editingProvider && (
        <EditProviderModal
          provider={editingProvider}
          onClose={() => setEditingProvider(null)}
        />
      )}
    </Box>
  );
}

function ProviderModal({
  mode,
  provider,
  onClose,
  variant = "default",
}: {
  mode: "create" | "edit";
  provider?: any;
  onClose: () => void;
  variant?: "default" | "light";
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();

  // Focus on the first field when modal opens
  useEffect(() => {
    if (opened || mode === "edit") {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        const firstInput = document.querySelector("[data-autofocus=\"true\"]") as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    }
  }, [opened, mode]);

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
      name: mode === "edit" ? (provider?.name || "") : "",
      model: mode === "edit" ? (provider?.model || "") : "",
      baseUrl: mode === "edit" ? (provider?.baseUrl || "") : "",
      apiKey: mode === "edit" ? (provider?.apiKey || "") : "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormData) => {
      // Simulate validation (replace with actual validation logic)
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (mode === "create") {
        return await insertLlmProvider({ data: values });
      } else {
        return await updateLlmProvider({ data: { id: provider.id, ...values } });
      }
    },
    onMutate: () => {
      return { startedAt: Date.now() };
    },
    onSuccess: (data, variables, { startedAt }) => {
      const duration = Math.min(2000, Math.max(1000, 3000 - (Date.now() - startedAt)));

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["providers"] });
        if (mode === "create") {
          form.reset();
          close();
        } else {
          onClose();
        }
      }, duration);
    },
    onError: (error) => {
      if (error.message) {
        form.setFieldError("name", error.message);
      }
    },
  });

  const handleSubmit = (values: FormData) => {
    mutation.mutate(values);
  };

  const handleClose = () => {
    if (mode === "create") {
      close();
    } else {
      onClose();
    }
  };

  const isModalOpened = mode === "edit" ? true : opened;
  const modalTitle = mode === "create" ? "Add new integration" : "Edit integration";
  const buttonText = mode === "create" ? "Add Integration" : "Update Integration";
  const loadingText = mode === "create" ? "Validating..." : "Updating...";

  return (
    <>
      {mode === "create" && (
        <Button
          variant={variant}
          disabled={mutation.isPending}
          onClick={open}
        >
          <IconPlus size={16} />
        </Button>
      )}
      <Modal
        opened={isModalOpened}
        onClose={handleClose}
        title={modalTitle}
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
              data-autofocus="true"
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
              autoComplete="off"
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
              <Button variant="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={mutation.isPending || mutation.isSuccess}
                leftSection={
                  <Transition mounted={mutation.isSuccess} transition="scale" duration={400}>
                    {(styles) => (
                      <Box style={styles}>
                        <IconCheck size={16} />
                      </Box>
                    )}
                  </Transition>
                }
              >
                {mutation.isSuccess ? "Success!" : mutation.isPending ? loadingText : buttonText}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

function NewProviderModal({ type, variant }: { type: "personal" | "organization"; variant: "default" | "light" }) {
  return (
    <ProviderModal
      mode="create"
      variant={variant}
      onClose={() => {}}
    />
  );
}

function EditProviderModal({ provider, onClose }: { provider: any; onClose: () => void }) {
  return (
    <ProviderModal
      mode="edit"
      provider={provider}
      onClose={onClose}
    />
  );
}
