import { zodResolver } from "@hookform/resolvers/zod";
import { RiLinkedinFill } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Mail } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { commands as dbCommands, type Human, type Organization } from "@hypr/plugin-db";
import { Button } from "@hypr/ui/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { extractWebsiteUrl } from "@hypr/utils";

const schema = z.object({
  email: z.string().email().optional(),
  linkedin_username: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

export function ContactInfo({
  human,
  organization,
  isEditing,
}: {
  human: Human;
  organization: Organization | null;
  isEditing: boolean;
}) {
  const queryClient = useQueryClient();

  const humanQuery = useQuery({
    initialData: human,
    queryKey: ["human", human.id],
    queryFn: () => dbCommands.getHuman(human.id),
  });

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    values: {
      email: humanQuery.data?.email ?? undefined,
      linkedin_username: humanQuery.data?.linkedin_username ?? undefined,
    },
  });

  const mutation = useMutation({
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
      queryClient.setQueryData(["human", human.id], data);
    },
  });

  useEffect(() => {
    if (isEditing) {
      const subscription = form.watch(() =>
        form.handleSubmit((values) => {
          mutation.mutate(values);
        })()
      );
      return () => subscription.unsubscribe();
    }
  }, [form, mutation, isEditing]);

  const getOrganizationWebsite = () => {
    return organization ? extractWebsiteUrl(humanQuery.data?.email) : null;
  };

  if (isEditing) {
    return (
      <div className="w-full">
        <Form {...form}>
          <form className="w-full">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 w-1/3 text-sm font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-gray-400" />
                      <span>Email</span>
                    </div>
                  </td>
                  <td className="py-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="Email Address"
                              className="border-none text-sm shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 w-1/3 text-sm font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                      <RiLinkedinFill className="size-4 text-gray-400" />
                      <span>LinkedIn</span>
                    </div>
                  </td>
                  <td className="py-2">
                    <FormField
                      control={form.control}
                      name="linkedin_username"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="LinkedIn Username"
                              className="border-none text-sm shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4">
      {human.email && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={`mailto:${human.email}`}>
                <Button
                  variant="outline"
                  size="icon"
                >
                  <Mail className="h-5 w-5" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{human.email}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {human.linkedin_username && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={`https://linkedin.com/in/${human.linkedin_username}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="icon"
                >
                  <RiLinkedinFill className="h-5 w-5" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">LinkedIn: {human.linkedin_username}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {organization && getOrganizationWebsite() !== null && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={getOrganizationWebsite()!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="icon"
                >
                  <Globe className="h-5 w-5" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{organization.name} Website</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
