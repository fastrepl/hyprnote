import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MembersList, RecentNotes, UpcomingEvents } from "@/components/organization-profile";
import { EditableEntityWrapper } from "@/components/toolbar/bars";
import { useEditMode } from "@/contexts/edit-mode-context";
import { commands as dbCommands, type Organization } from "@hypr/plugin-db";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";

export const Route = createFileRoute("/app/organization/$id")({
  component: Component,
  loader: async ({ context: { queryClient }, params }) => {
    const organization = await queryClient.fetchQuery({
      queryKey: ["org", params.id],
      queryFn: () => dbCommands.getOrganization(params.id),
    });

    if (!organization) {
      throw notFound();
    }

    return { organization };
  },
});

const formSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

type FormSchema = z.infer<typeof formSchema>;

function Component() {
  const { organization } = Route.useLoaderData();
  const { isEditing } = useEditMode();

  const { data: members = [] } = useQuery({
    queryKey: ["org", organization.id, "members"],
    queryFn: () => dbCommands.listOrganizationMembers(organization.id),
  });

  const organizationQuery = useQuery({
    initialData: organization,
    queryKey: ["org", organization.id],
    queryFn: () => dbCommands.getOrganization(organization.id),
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    values: {
      name: organizationQuery.data?.name ?? "",
      description: organizationQuery.data?.description ?? "",
    },
  });

  return (
    <EditableEntityWrapper>
      {isEditing ? <OrgEdit form={form} /> : <OrgView value={organization} />}
      <MembersList organizationId={organization.id} />
      <UpcomingEvents organizationId={organization.id} members={members} />
      <RecentNotes organizationId={organization.id} members={members} />
    </EditableEntityWrapper>
  );
}

function OrgView({ value }: { value: Organization }) {
  return (
    <div>
      <h1>Organization Name: {value.name}</h1>
    </div>
  );
}
function OrgEdit({ form }: { form: ReturnType<typeof useForm<FormSchema>> }) {
  return (
    <div>
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Organization Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea placeholder="Description" {...field} />
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
