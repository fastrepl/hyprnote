import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as dbCommands, type ConfigNotification } from "@hypr/plugin-db";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { Switch } from "@hypr/ui/components/ui/switch";
import { Trans } from "@lingui/react/macro";

const CALL_PLATFORMS = [
  "zoom",
  "meet",
  "teams",
  "webex",
  "slack",
  "goto",
  "cal.com",
  "jitsi",
  "zoho",
  "discord",
  "skype",
  "facetime",
  "whatsapp",
  "messenger",
  "openphone",
  "telegram",
  "kakao",
  "line",
  "chrome",
  "safari",
  "firefox",
  "edge",
  "brave",
  "opera",
];

const schema = z.object({
  before: z.boolean().optional(),
  auto: z.boolean().optional(),
  ignoredPlatforms: z.array(z.string()).optional(),
});

type Schema = z.infer<typeof schema>;

export default function NotificationsComponent() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const config = useQuery({
    queryKey: ["config", "notifications"],
    queryFn: async () => {
      const result = await dbCommands.getConfig();
      return result;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      before: config.data?.notification.before ?? true,
      auto: config.data?.notification.auto ?? true,
      ignoredPlatforms: config.data?.notification.ignoredPlatforms ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      const newNotification: ConfigNotification = {
        before: v.before ?? true,
        auto: v.auto ?? true,
        ignoredPlatforms: v.ignoredPlatforms ?? [],
      };

      if (!config.data) {
        console.error("cannot mutate config because it is not loaded");
        return;
      }

      try {
        await dbCommands.setConfig({
          ...config.data,
          notification: newNotification,
        });
      } catch (e) {
        console.error(e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "notifications"] });
    },
  });

  useEffect(() => {
    const subscription = form.watch(() => form.handleSubmit((v) => mutation.mutate(v))());
    return () => subscription.unsubscribe();
  }, [mutation]);

  // Filter platforms based on search query
  const filteredPlatforms = CALL_PLATFORMS.filter(platform =>
    platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle platform selection
  const togglePlatform = (platform: string) => {
    const currentIgnoredPlatforms = form.getValues().ignoredPlatforms || [];
    if (currentIgnoredPlatforms.includes(platform)) {
      form.setValue("ignoredPlatforms", currentIgnoredPlatforms.filter(p => p !== platform), { shouldDirty: true });
    } else {
      form.setValue("ignoredPlatforms", [...currentIgnoredPlatforms, platform], { shouldDirty: true });
    }
  };

  return (
    <div>
      <Form {...form}>
        <form className="space-y-6">
          <FormField
            control={form.control}
            name="before"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <div>
                  <FormLabel>
                    <Trans>Notify upcoming events</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>Show notifications 1 minute before events start based on your calendars</Trans>
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

          <FormField
            control={form.control}
            name="auto"
            render={({ field }) => (
              <FormItem className="space-y-6">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <FormLabel>
                      <Trans>Detect meetings automatically</Trans>
                    </FormLabel>
                    <FormDescription>
                      <Trans>Show notifications whenever a microphone is being used</Trans>
                    </FormDescription>
                  </div>

                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>

                {field.value && (
                  <div className="relative ml-6 mt-2">
                    {/* Branch-like UI connector */}
                    <div className="absolute -left-6 -top-4 h-8 w-4 border-l-2 border-b-2 border-muted" />

                    <FormField
                      control={form.control}
                      name="ignoredPlatforms"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-sm">
                            <Trans>Exclude these apps from auto detection</Trans>
                          </FormLabel>
                          <FormDescription className="text-xs">
                            <Trans>Select apps that should not trigger meeting notifications</Trans>
                          </FormDescription>

                          <div className="mt-2 space-y-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Search platforms..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                            </div>

                            <div className="rounded-md border">
                              <div className="p-2">
                                {filteredPlatforms.map(platform => {
                                  const isSelected = form.getValues().ignoredPlatforms?.includes(platform) || false;
                                  return (
                                    <div
                                      key={platform}
                                      className={`flex cursor-pointer items-center rounded-sm px-2 py-1 hover:bg-muted ${
                                        isSelected ? "bg-muted" : ""
                                      }`}
                                      onClick={() => togglePlatform(platform)}
                                    >
                                      <div className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm border">
                                        {isSelected && <span className="text-xs">✓</span>}
                                      </div>
                                      <span className="text-sm">
                                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
