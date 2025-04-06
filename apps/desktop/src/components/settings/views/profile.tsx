import { zodResolver } from "@hookform/resolvers/zod";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useHypr } from "@/contexts";
import { commands as dbCommands, type Human, type Organization } from "@hypr/plugin-db";
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
import { Textarea } from "@hypr/ui/components/ui/textarea";

const schema = z.object({
  fullName: z.string().min(2).max(50).optional(),
  jobTitle: z.string().min(2).max(50).optional(),
  companyName: z.string().min(2).max(50),
  companyDescription: z.string().min(2).max(500).optional(),
  linkedinUserName: z.string().min(2).max(50).optional(),
});

type Schema = z.infer<typeof schema>;

export default function ProfileComponent() {
  const { t } = useLingui();
  const { userId } = useHypr();
  const queryClient = useQueryClient();

  const config = useQuery({
    enabled: !!userId,
    queryKey: ["config", "profile", userId],
    queryFn: async () => {
      const [human, organization] = await Promise.all([
        dbCommands.getHuman(userId),
        dbCommands.getOrganizationByUserId(userId),
      ]);

      return { human: human!, organization };
    },
  });

  const form = useForm<Schema>({
    mode: "onTouched",
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (config.data) {
      form.reset({
        fullName: config.data.human?.full_name ?? "",
        jobTitle: config.data.human?.job_title ?? "",
        companyName: config.data.organization?.name ?? "",
        companyDescription: config.data.organization?.description ?? "",
        linkedinUserName: config.data.human?.linkedin_username ?? "",
      });
    }
  }, [config.data, form]);

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (!config.data) {
        console.error("cannot mutate profile because it is not loaded");
        return;
      }

      const newHuman: Human = {
        ...config.data.human!,
        full_name: v.fullName ?? null,
        job_title: v.jobTitle ?? null,
        email: config.data.human?.email ?? null,
        linkedin_username: v.linkedinUserName ?? null,
      };

      const newOrganization: Organization = {
        id: config.data.organization?.id ?? crypto.randomUUID(),
        name: v.companyName,
        description: v.companyDescription ?? null,
      };

      await dbCommands.upsertOrganization(newOrganization).then(() => {
        dbCommands.upsertHuman(newHuman);
      });
    },
    onError: console.error,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["config", "profile", userId],
      });
    },
  });
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (form.formState.isDirty && form.formState.isValid) {
        form.handleSubmit((v) => mutation.mutate(v))();
      }
    });

    return () => subscription.unsubscribe();
  }, [mutation]);
  return (
    <div>
      <Form {...form}>
        <form className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className="w-60">
                <FormLabel>
                  <Trans>Full name</Trans>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t`Your Name`}
                    {...field}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem className="w-60">
                <FormLabel>
                  <Trans>Job title</Trans>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t`CEO`}
                    {...field}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem className="w-60">
                <div>
                  <FormLabel>
                    <Trans>Company name</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>This is the name of the company you work for.</Trans>
                  </FormDescription>
                </div>
                <FormControl>
                  <Input
                    placeholder={t`Apple`}
                    {...field}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyDescription"
            render={({ field }) => (
              <FormItem className="max-w-lg">
                <div>
                  <FormLabel>
                    <Trans>Company description</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>This is a short description of your company.</Trans>
                  </FormDescription>
                </div>
                <FormControl>
                  <Textarea
                    placeholder={t`We think different.`}
                    {...field}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="linkedinUserName"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <div>
                  <FormLabel>
                    <Trans>LinkedIn username</Trans>
                  </FormLabel>
                  <FormDescription>
                    <Trans>
                      Your LinkedIn username (the part after linkedin.com/in/)
                    </Trans>
                  </FormDescription>
                </div>
                <FormControl>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                      linkedin.com/in/
                    </span>
                    <Input
                      className="rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder={t`username`}
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
