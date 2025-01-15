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

import { commands, type ConfigDataProfile } from "@/types/tauri";

const schema = z.object({
  fullName: z.string().min(2).max(50).optional(),
  jobTitle: z.string().min(2).max(50).optional(),
  companyName: z.string().min(2).max(50).optional(),
  companyDescription: z.string().min(2).max(50).optional(),
  linkedinUserName: z.string().min(2).max(50).optional(),
});

type Schema = z.infer<typeof schema>;

export default function Profile() {
  const queryClient = useQueryClient();

  const config = useQuery({
    queryKey: ["config", "profile"],
    queryFn: async () => {
      const result = await commands.dbGetConfig("profile");
      if (result === null) {
        return null;
      }
      return result.data as ConfigDataProfile;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: config.data?.full_name ?? undefined,
      jobTitle: config.data?.job_title ?? undefined,
      companyName: config.data?.company_name ?? undefined,
      companyDescription: config.data?.company_description ?? undefined,
      linkedinUserName: config.data?.linkedin_username ?? undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: Schema) => {
      const config: ConfigDataProfile = {
        full_name: v.fullName ?? null,
        job_title: v.jobTitle ?? null,
        company_name: v.companyName ?? null,
        company_description: v.companyDescription ?? null,
        linkedin_username: v.linkedinUserName ?? null,
      };

      await commands.dbSetConfig({ type: "profile", data: config });
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
              <FormItem>
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
              <FormItem>
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
              <FormItem>
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
              <FormItem>
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
        </form>
      </Form>
    </div>
  );
}
