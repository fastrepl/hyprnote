import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { client, commands as obsidianCommands, getCommands } from "@hypr/plugin-obsidian";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { Switch } from "@hypr/ui/components/ui/switch";

const schema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function IntegrationsComponent() {
  const getEnabled = useQuery({
    queryKey: ["obsidian-enabled"],
    queryFn: () => obsidianCommands.getEnabled(),
  });

  const getApiKey = useQuery({
    queryKey: ["obsidian-api-key"],
    queryFn: () => obsidianCommands.getApiKey(),
  });

  const getBaseUrl = useQuery({
    queryKey: ["obsidian-base-url"],
    queryFn: () => obsidianCommands.getBaseUrl(),
  });

  const _listObsidianCommands = async () => {
    client.setConfig({
      auth: () => getApiKey.data!,
      baseUrl: getBaseUrl.data!,
    });
    const commands = await getCommands({ client });
    return commands;
  };

  const setApiKey = useMutation({
    mutationFn: (apiKey: string) => obsidianCommands.setApiKey(apiKey),
    onSuccess: () => {
      getApiKey.refetch();
      getEnabled.refetch();
    },
  });

  const setBaseUrl = useMutation({
    mutationFn: (baseUrl: string) => obsidianCommands.setBaseUrl(baseUrl),
    onSuccess: () => {
      getBaseUrl.refetch();
      getEnabled.refetch();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      enabled: false,
      baseUrl: "",
      apiKey: "",
    },
  });

  useEffect(() => {
    if (getApiKey.data !== undefined && getBaseUrl.data !== undefined) {
      form.reset({
        enabled: getEnabled.data || false,
        baseUrl: getBaseUrl.data || "",
        apiKey: getApiKey.data || "",
      });
    }
  }, [getApiKey.data, getBaseUrl.data, getEnabled.data]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!form.formState.errors.baseUrl && value.baseUrl && value.enabled) {
        setBaseUrl.mutate(value.baseUrl);
      }
      if (!form.formState.errors.apiKey && value.apiKey && value.enabled) {
        setApiKey.mutate(value.apiKey);
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          <Trans>Integrations</Trans>
        </h3>
        <p className="text-sm text-muted-foreground">
          <Trans>Connect with external tools and services to enhance your workflow</Trans>
        </p>
      </div>

      <div className="space-y-4">
        {/* Obsidian Integration Card */}
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-medium">
                <Trans>Obsidian</Trans>
              </h4>
              <p className="text-sm text-muted-foreground">
                <Trans>Connect your Obsidian vault to sync notes and data</Trans>
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  getEnabled.data ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                {getEnabled.data ? <Trans>Connected</Trans> : <Trans>Not Connected</Trans>}
              </span>
            </div>
          </div>

          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        <Trans>Enable Integration</Trans>
                      </FormLabel>
                      <FormDescription>
                        <Trans>Turn on Obsidian integration</Trans>
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("enabled") && (
                <div className="space-y-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="baseUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>Base URL</Trans>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://your-obsidian-server.com"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          <Trans>The base URL of your Obsidian server</Trans>
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Trans>API Key</Trans>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your API key"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          <Trans>Your Obsidian API key for authentication</Trans>
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </Form>
        </div>

        {/* Placeholder for future integrations */}
        <div className="rounded-lg border border-dashed p-6 text-center">
          <div className="text-muted-foreground">
            <p className="text-sm">
              <Trans>More integrations coming soon...</Trans>
            </p>
            <p className="text-xs mt-1">
              <Trans>We're working on adding more tools and services to connect with your workflow</Trans>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
