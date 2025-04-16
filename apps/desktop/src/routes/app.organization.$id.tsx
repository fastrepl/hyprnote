import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { BuildingIcon } from "lucide-react";
import { useEffect, useRef } from "react";
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
  description: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

function Component() {
  const { organization } = Route.useLoaderData();
  const router = useRouter();
  const { isEditing, setIsEditing } = useEditMode();

  const { data: members = [] } = useQuery({
    queryKey: ["org", organization.id, "members"],
    queryFn: () => dbCommands.listOrganizationMembers(organization.id),
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    values: {
      name: organization.name ?? "",
      description: organization.description ?? "",
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: (data: Partial<Organization>) =>
      dbCommands.upsertOrganization({
        ...organization,
        ...data,
      }),
    onSuccess: () => {
      router.invalidate();
    },
  });

  useEffect(() => {
    if (!isEditing) {
      form.handleSubmit(
        (v) => updateOrganizationMutation.mutate(v),
        (_) => {
          setIsEditing(true);
        },
      )();
    }
  }, [isEditing, setIsEditing]);

  return (
    <EditableEntityWrapper>
      {isEditing ? <OrgEdit form={form} /> : <OrgView value={organization} />}
      <div className="max-w-md mx-auto">
        <MembersList organizationId={organization.id} />
      </div>
      <div className="max-w-md mx-auto">
        <UpcomingEvents organizationId={organization.id} members={members} />
      </div>
      <div className="max-w-md mx-auto">
        <RecentNotes organizationId={organization.id} members={members} />
      </div>
    </EditableEntityWrapper>
  );
}

function OrgView({ value }: { value: Organization }) {
  return (
    <div>
      <div className="flex flex-col items-center pb-6">
        <div className="flex items-center justify-center w-24 h-24 mb-3 bg-gray-100 rounded-full">
          <BuildingIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h1 className="text-2xl font-semibold text-center">{value.name}</h1>
        {value.description && (
          <p className="mt-2 text-gray-500 text-center max-w-md">
            {value.description}
          </p>
        )}
      </div>
    </div>
  );
}

function OrgEdit({ form }: { form: ReturnType<typeof useForm<FormSchema>> }) {
  // Refs for auto-resizing textareas
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  // Function to adjust textarea height
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) {
      return;
    }

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set the height to match the content
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Create a ref callback that combines React Hook Form's ref with our local ref
  const setDescriptionRef = (element: HTMLTextAreaElement | null) => {
    descriptionRef.current = element;
    if (element) {
      adjustTextareaHeight(element);
    }
  };

  // Watch for description changes to adjust height
  const description = form.watch("description");

  useEffect(() => {
    adjustTextareaHeight(descriptionRef.current);
  }, [description]);

  return (
    <div>
      <div className="flex flex-col items-center pb-6">
        <div className="flex items-center justify-center w-24 h-24 mb-3 bg-gray-100 rounded-full">
          <BuildingIcon className="w-12 h-12 text-gray-400" />
        </div>
      </div>

      <Form {...form}>
        <form>
          <div className="border-t border-gray-200">
            <div className="flex items-center px-4 py-3 border-b border-gray-200">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="flex items-center">
                      <div className="w-28 text-sm text-gray-500">Name</div>
                      <FormControl className="flex-1">
                        <Input
                          placeholder="Organization Name"
                          {...field}
                          className="border-none p-0 h-7 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center px-4 py-3 border-b border-gray-200">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="flex items-start">
                      <div className="w-28 text-sm text-gray-500">
                        Description
                      </div>
                      <FormControl className="flex-1 -mt-[3px]">
                        <Textarea
                          placeholder="Company description"
                          {...field}
                          ref={(e) => {
                            field.ref(e);
                            setDescriptionRef(e);
                          }}
                          className="border-none p-0 min-h-[60px] text-base focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                          onInput={(e) => adjustTextareaHeight(e.currentTarget)}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
