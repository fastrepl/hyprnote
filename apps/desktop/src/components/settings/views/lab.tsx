import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as dbCommands, type ConfigGeneral } from "@hypr/plugin-db";
import { Form } from "@hypr/ui/components/ui/form";
import { Switch } from "@hypr/ui/components/ui/switch";

const schema = z.object({
  noteChat: z.boolean().optional(),
});

type Schema = z.infer<typeof schema>;

export default function Lab() {
  const queryClient = useQueryClient();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setIsAnimating(false);
      }, 1625);
      return () => clearTimeout(timeout);
    }, 4625);

    return () => clearInterval(animationInterval);
  }, []);

  const config = useQuery({
    queryKey: ["config", "lab"],
    queryFn: async () => {
      const result = await dbCommands.getConfig();
      return result;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      noteChat: config.data?.general.note_chat ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (!config.data) {
        console.error("cannot mutate config because it is not loaded");
        return;
      }

      const nextGeneral: ConfigGeneral = {
        note_chat: v.noteChat ?? false,
      };

      try {
        await dbCommands.setConfig({
          ...config.data,
          general: nextGeneral,
        });
      } catch (e) {
        console.error(e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "lab"] });
    },
  });

  useEffect(() => {
    const subscription = form.watch(() => form.handleSubmit((v) => mutation.mutate(v))());
    return () => subscription.unsubscribe();
  }, [mutation]);

  return (
    <div>
      <Form {...form}>
        <form className="space-y-4">
          <FeatureFlag
            name="noteChat"
            title="Hyprnote Assistant"
            description="Ask our AI assistant about past notes and upcoming events"
            icon={
              <div className="relative w-6 aspect-square flex items-center justify-center">
                <img
                  src={isAnimating ? "/assets/dynamic.gif" : "/assets/static.png"}
                  alt="AI Assistant"
                  className="w-full h-full"
                />
              </div>
            }
            form={form}
          />
        </form>
      </Form>
    </div>
  );
}

function FeatureFlag({
  name,
  title,
  description,
  icon,
  form,
}: {
  name: keyof Schema;
  title: string;
  description: string;
  icon: React.ReactNode;
  form: ReturnType<typeof useForm<Schema>>;
}) {
  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium">
              <Trans>{title}</Trans>
            </div>
            <div className="text-xs text-muted-foreground">
              <Trans>{description}</Trans>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={form.watch(name)}
            onCheckedChange={(checked) => form.setValue(name, checked, { shouldDirty: true })}
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}
