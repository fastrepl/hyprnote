import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useEditMode } from "@/contexts";
import { commands as dbCommands, type Human } from "@hypr/plugin-db";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";

export const Route = createFileRoute("/app/human/$id")({
  component: Component,
  loader: async ({ context: { queryClient }, params }: { context: { queryClient: any }; params: { id: string } }) => {
    const human = await queryClient.fetchQuery({
      queryKey: ["human", params.id],
      queryFn: () => dbCommands.getHuman(params.id),
    });

    if (!human) {
      throw notFound();
    }

    if (!human.organization_id) {
      return { human, organization: null };
    }

    const organization = await queryClient.fetchQuery({
      queryKey: ["org", human.organization_id],
      queryFn: () => dbCommands.getOrganization(human.organization_id!),
    });

    return { human, organization };
  },
});

const formSchema = z.object({
  full_name: z.string().optional(),
  job_title: z.string().optional(),
  email: z.string().email().optional(),
  linkedin_username: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

function Component() {
  const { human } = Route.useLoaderData();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isEditing } = useEditMode();

  const humanQuery = useQuery({
    initialData: human,
    queryKey: ["human", human.id],
    queryFn: () => dbCommands.getHuman(human.id),
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    values: {
      full_name: humanQuery.data?.full_name ?? "",
      job_title: humanQuery.data?.job_title ?? "",
      email: humanQuery.data?.email ?? "",
      linkedin_username: humanQuery.data?.linkedin_username ?? "",
    },
  });

  const updateHumanMutation = useMutation({
    mutationFn: (data: Partial<Human>) => {
      if (!humanQuery.data) {
        return Promise.reject("human_data_not_loaded");
      }

      return dbCommands.upsertHuman({
        ...humanQuery.data,
        ...data,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["human", humanQuery.data?.id], data);
      router.invalidate();
    },
  });

  useEffect(() => {
    if (!isEditing) {
      form.handleSubmit((v) => updateHumanMutation.mutate(v))();
    }
  }, [isEditing]);

  if (!humanQuery.data) {
    return null;
  }

  return isEditing
    ? <HumanEdit form={form} />
    : <HumanView value={humanQuery.data} />;
}

function HumanView({ value }: { value: Human }) {
  return (
    <div>
      <h1>full_name: {value.full_name}</h1>
      <h1>email: {value.email}</h1>
      <h1>job_title: {value.job_title}</h1>
      <h1>linkedin_username: {value.linkedin_username}</h1>
    </div>
  );
}

function HumanEdit({ form }: { form: ReturnType<typeof useForm<FormSchema>> }) {
  return (
    <div>
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Full Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="email" placeholder="Email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="job_title"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Job Title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="linkedin_username"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="LinkedIn Username" {...field} />
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
