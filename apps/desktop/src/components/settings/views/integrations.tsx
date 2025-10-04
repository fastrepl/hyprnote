import { zodResolver } from "@hookform/resolvers/zod";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as obsidianCommands } from "@hypr/plugin-obsidian";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { Switch } from "@hypr/ui/components/ui/switch";

const schema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().url().refine((url) => url.startsWith("http://") && !url.startsWith("https://"), {
    message: "URL must start with http://, not https://",
  }),
  apiKey: z.string().min(1, "API key is required"),
  vaultName: z.string().min(1, "Vault name is required"),
  baseFolder: z.string().optional(),
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

  const getBaseFolder = useQuery({
    queryKey: ["obsidian-base-folder"],
    queryFn: () => obsidianCommands.getBaseFolder?.() || Promise.resolve(""),
  });

  const getVaultName = useQuery({
    queryKey: ["obsidian-vault-name"],
    queryFn: () => obsidianCommands.getVaultName(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      enabled: false,
      baseUrl: "",
      apiKey: "",
      vaultName: "",
      baseFolder: "",
    },
  });

  useEffect(() => {
    form.reset({
      enabled: getEnabled.data || false,
      baseUrl: getBaseUrl.data || "http://127.0.0.1:27123",
      apiKey: getApiKey.data || "",
      vaultName: getVaultName.data || "",
      baseFolder: getBaseFolder.data || "",
    });
  }, [
    form,
    getEnabled.data,
    getBaseUrl.data,
    getApiKey.data,
    getVaultName.data,
    getBaseFolder.data,
  ]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "enabled") {
        obsidianCommands.setEnabled(value.enabled ?? false);
      }

      if (name === "baseUrl") {
        obsidianCommands.setBaseUrl(value.baseUrl ?? "");
      }

      if (name === "apiKey") {
        obsidianCommands.setApiKey(value.apiKey ?? "");
      }

      if (name === "vaultName") {
        obsidianCommands.setVaultName(value.vaultName ?? "");
      }

      if (name === "baseFolder") {
        obsidianCommands.setBaseFolder(value.baseFolder ?? "");
      }
    });

    // store initial base url even if it's not by the user
    const currentValues = form.getValues();
    if (getBaseUrl.isSuccess && !getBaseUrl.data && currentValues.baseUrl) {
      obsidianCommands.setBaseUrl(currentValues.baseUrl);
    }

    return () => subscription.unsubscribe();
  }, [form, getBaseUrl.isSuccess, getBaseUrl.data]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          Integrations
        </h3>
        <p className="text-sm text-muted-foreground">
          Connect with external tools and services to enhance your workflow
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-base font-medium">
                Obsidian
              </h4>
              <p className="text-sm text-muted-foreground">
                Connect your Obsidian vault to export notes
              </p>
            </div>
          </div>

          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Enable Integration
                      </FormLabel>
                      <FormDescription>
                        Turn on Obsidian integration to export notes to Obsidian vault.
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
                          Base URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="http://localhost:27123"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The base URL of your Obsidian server. This is typically http://127.0.0.1:27123.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          API Key
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your Obsidian API key"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Your API key for Obsidian local-rest-api plugin.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vaultName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Vault Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your Obsidian vault name"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The name of your Obsidian vault.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="baseFolder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Base Folder
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Notes, Journal, or leave empty for root"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional base folder path within your Obsidian vault.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </form>
          </Form>
        </div>

        <div className="rounded-lg border border-dashed p-6 text-center">
          <div className="text-muted-foreground">
            <p className="text-sm">
              More integrations coming soon...
            </p>
            <p className="text-xs mt-1">
              We're working on adding more tools and services to connect with your workflow
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
