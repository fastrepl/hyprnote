import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconRobot, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";

import { insertLlmProvider, listLlmProvider } from "@/services/provider.api";

export const Route = createFileRoute("/app/providers")({
  component: Component,
});

function Component() {
  return (
    <Stack gap="xl">
      <div>
        <Title order={1}>
          Providers
        </Title>
        <Text c="dimmed" size="sm">
          Manage your AI providers and their configurations
        </Text>
      </div>

      <ProvidersSection />
    </Stack>
  );
}

function ProvidersSection() {
  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconRobot size={20} />
          <Title order={3}>LLM Providers</Title>
        </Group>
        <NewProviderModal />
      </Group>

      <ProvidersTable />
    </Paper>
  );
}

function ProvidersTable() {
  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const rows = await listLlmProvider();
      return rows;
    },
  });

  return (
    <Box pos="relative">
      <LoadingOverlay visible={isLoading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

      {providers?.length === 0
        ? (
          <Center py="xl">
            <Stack align="center" gap="md">
              <IconRobot size={48} color="var(--mantine-color-gray-5)" />
              <Stack align="center" gap="xs">
                <Text size="lg" fw={500}>
                  No LLM providers configured
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Get started by adding your first LLM provider to enable AI features
                </Text>
              </Stack>
              <NewProviderModal variant="filled" />
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
                          onClick={() => {
                            console.log("Delete provider:", provider.id);
                          }}
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

function NewProviderModal({ variant = "default" }: { variant?: string }) {
  const [opened, { open, close }] = useDisclosure(false);
  const queryClient = useQueryClient();

  const schema = z.object({
    name: z.string().min(1, "Name is required").max(20, "Name too long"),
    model: z.string().min(1, "Model is required").max(100, "Model name too long"),
    baseUrl: z.string().min(1, "Base URL is required").max(255, "URL too long"),
    apiKey: z.string().min(1, "API Key is required").max(500, "API Key too long"),
  });

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    mode: "uncontrolled",
    validate: zodResolver(schema),
    initialValues: {
      name: "",
      model: "",
      baseUrl: "",
      apiKey: "",
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const rows = await insertLlmProvider({ data });
      return rows;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      form.reset();
      close();
    },
    onError: (error) => {
      console.error("Failed to add provider:", error);
    },
  });

  const handleSubmit = (values: FormData) => {
    insertMutation.mutate(values);
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title="Add New LLM Provider"
        centered
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Provider Name"
              placeholder="e.g., OpenAI GPT-4"
              required
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Model"
              placeholder="e.g., gpt-4-turbo"
              required
              {...form.getInputProps("model")}
            />
            <TextInput
              label="Base URL"
              placeholder="e.g., https://api.openai.com/v1"
              required
              {...form.getInputProps("baseUrl")}
            />
            <TextInput
              label="API Key"
              placeholder="Your API key"
              type="password"
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
                leftSection={<IconPlus size={16} />}
              >
                Add Provider
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Button
        variant={variant as any}
        leftSection={<IconPlus size={16} />}
        onClick={open}
      >
        Add Provider
      </Button>
    </>
  );
}
