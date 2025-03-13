import { zodResolver } from "@hookform/resolvers/zod";
import { type Human } from "@hypr/plugin-db";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  jobTitle: z.string().min(2).max(50).optional().or(z.literal("")),
  linkedinUsername: z.string().min(2).max(50).optional().or(z.literal("")),
});

type Schema = z.infer<typeof schema>;

interface EditParticipantFormProps {
  participant: Human;
  onClose: () => void;
  sessionId?: string;
  onParticipantEdited: (participantId: string) => void;
}

export function EditParticipantForm({
  participant,
  onClose,
  sessionId,
  onParticipantEdited,
}: EditParticipantFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: participant.email || "",
      jobTitle: participant.job_title || "",
      linkedinUsername: participant.linkedin_username || "",
    },
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async (values: Schema) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));

      const updatedParticipant = {
        ...participant,
        email: values.email || null,
        job_title: values.jobTitle || null,
        linkedin_username: values.linkedinUsername || null,
      };

      return updatedParticipant;
    },
    onSuccess: (updatedParticipant) => {
      onParticipantEdited(updatedParticipant.id);

      queryClient.setQueryData(
        ["participants", sessionId!],
        (oldData: Human[] | undefined) =>
          oldData
            ? oldData.map(p => p.id === updatedParticipant.id ? updatedParticipant : p)
            : [updatedParticipant],
      );

      onClose();
    },
  });

  const onSubmit = (values: Schema) => {
    updateParticipantMutation.mutate(values);
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Edit Participant Information</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="max-w-sm">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Email address"
                    type="email"
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
              <FormItem className="max-w-sm">
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Job title"
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
            name="linkedinUsername"
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
                      className="rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="username"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateParticipantMutation.isPending}
              className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-100 rounded-md text-xs font-medium transition-colors"
            >
              {updateParticipantMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}
