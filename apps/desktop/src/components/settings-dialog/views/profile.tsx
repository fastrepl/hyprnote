import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

import { type Human } from "@/types";
import { commands as dbCommands, type Organization } from "@hypr/plugin-db";

const schema = z.object({
  fullName: z.string().min(2).max(50).optional(),
  jobTitle: z.string().min(2).max(50).optional(),
  companyName: z.string().min(2).max(50).optional(),
  companyDescription: z.string().min(2).max(50).optional(),
  linkedinUserName: z.string().min(2).max(50).optional(),
});

type Schema = z.infer<typeof schema>;

export default function ProfileComponent() {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ["config", "profile"],
    queryFn: async () => {
      const [human, organization] = await Promise.all([
        dbCommands.getSelfHuman(),
        dbCommands.getSelfOrganization(),
      ]);
      return { human, organization };
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: config.data?.human.full_name ?? undefined,
      jobTitle: config.data?.human.job_title ?? undefined,
      companyName: config.data?.organization.name ?? undefined,
      companyDescription: config.data?.organization.description ?? undefined,
      linkedinUserName: config.data?.human.linkedin_username ?? undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      if (!config.data) {
        console.error("cannot mutate profile because it is not loaded");
        return;
      }

      const newHuman: Human = {
        ...config.data.human,
        full_name: v.fullName ?? null,
        job_title: v.jobTitle ?? null,
        linkedin_username: v.linkedinUserName ?? null,
      };

      const newOrganization: Organization = {
        ...config.data.organization,
        name: v.companyName ?? "",
        description: v.companyDescription ?? "",
      };

      try {
        await dbCommands.upsertHuman(newHuman);
        await dbCommands.upsertOrganization(newOrganization);
      } catch (error) {
        console.error("error upserting human or organization", error);
      }
    },
  });

  useEffect(() => {
    if (mutation.status === "success") {
      queryClient.invalidateQueries({ queryKey: ["config", "profile"] });
    }
  }, [mutation.status]);

  useEffect(() => {
    const subscription = form.watch(() =>
      form.handleSubmit((v) => mutation.mutate(v))(),
    );
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
              <FormItem className="max-w-sm">
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Your Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <div>
                  <FormLabel>Company Name</FormLabel>
                  <FormDescription>
                    This is the name of the company you work for.
                  </FormDescription>
                </div>
                <FormControl>
                  <Input {...field} />
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
                  <FormLabel>Company Description</FormLabel>
                  <FormDescription>
                    This is a short description of your company.
                  </FormDescription>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Add a few words about your company."
                    {...field}
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
                  <FormLabel>LinkedIn Username</FormLabel>
                  <FormDescription>
                    Your LinkedIn username (the part after linkedin.com/in/)
                  </FormDescription>
                </div>
                <FormControl>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                      linkedin.com/in/
                    </span>
                    <Input
                      className="rounded-l-none"
                      placeholder="username"
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
