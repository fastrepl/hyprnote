import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { RiCornerDownLeftLine, RiLinkedinBoxFill, RiMailLine } from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { BuildingIcon, CircleMinus, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EditableEntityWrapper } from "@/components/toolbar/bars";
import { useEditMode } from "@/contexts";
import { commands as dbCommands, type Human, type Organization } from "@hypr/plugin-db";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@hypr/ui/components/ui/form";
import { Input } from "@hypr/ui/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

export const Route = createFileRoute("/app/human/$id")({
  component: Component,
  loader: async ({
    context: { queryClient },
    params,
  }: {
    context: { queryClient: any };
    params: { id: string };
  }) => {
    const human: Human | null = await queryClient.fetchQuery({
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
  email: z.union([z.string().email(), z.string().length(0)]).optional(),
  linkedin_username: z.string().optional(),
  organization_id: z.string().nullable(),
});

function parseLinkedInUrl(url: string): string {
  if (!url) {
    return "";
  }

  try {
    if (url.includes("linkedin.com/in/")) {
      const match = url.match(/linkedin\.com\/in\/([^\/\?#]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return url;
  } catch (error) {
    return "";
  }
}

type FormSchema = z.infer<typeof formSchema>;

function Component() {
  const { human, organization } = Route.useLoaderData();
  const router = useRouter();
  const { isEditing, setIsEditing } = useEditMode();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    values: {
      full_name: human.full_name ?? "",
      job_title: human.job_title ?? "",
      email: human.email ?? "",
      linkedin_username: human.linkedin_username ?? "",
      organization_id: human.organization_id,
    },
  });

  const updateHumanMutation = useMutation({
    mutationFn: (data: Partial<Human>) => {
      // Parse LinkedIn URL if needed before saving
      if (data.linkedin_username) {
        data.linkedin_username = parseLinkedInUrl(data.linkedin_username);
      }

      return dbCommands.upsertHuman({
        ...human,
        ...data,
      });
    },
    onSuccess: () => {
      router.invalidate();
    },
    onError: () => {
      console.log("Failed to update human");
    },
  });

  useEffect(() => {
    if (!isEditing) {
      form.handleSubmit(
        (v) => updateHumanMutation.mutate(v),
        (_) => {
          setIsEditing(true);
        },
      )();
    }
  }, [isEditing, setIsEditing]);

  return (
    <EditableEntityWrapper>
      {isEditing ? <HumanEdit form={form} /> : <HumanView value={human} organization={organization} />}
    </EditableEntityWrapper>
  );
}

function HumanView({
  value,
  organization,
}: {
  value: Human;
  organization: Organization | null;
}) {
  const navigate = useNavigate();

  const handleClickOrganization = () => {
    if (organization) {
      navigate({
        to: "/app/organization/$id",
        params: { id: organization.id },
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) {
      return "?";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div>
      <div className="flex flex-col items-center pb-6">
        <Avatar className="w-24 h-24 mb-3 bg-gray-200">
          <AvatarFallback className="text-xl font-semibold text-gray-600">
            {getInitials(value.full_name || "?")}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-semibold text-center">
          {value.full_name || "Unnamed Contact"}
        </h1>
        {(value.job_title || organization) && (
          <p className="text-gray-500 mt-1 text-center">
            {value.job_title || ""}
            {value.job_title && organization && " at "}
            {organization && (
              <span
                className="text-blue-600 hover:underline cursor-pointer"
                onClick={handleClickOrganization}
              >
                {organization.name}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="pt-4">
        <div className="flex justify-center gap-6">
          {value.email && (
            <a
              href={`mailto:${value.email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center"
              title={value.email}
            >
              <div className="mb-2">
                <RiMailLine className="size-6 text-gray-700 hover:text-gray-900 transition-colors" />
              </div>
              <span className="text-xs text-gray-500">Email</span>
            </a>
          )}

          {value.linkedin_username && (
            <a
              href={`https://linkedin.com/in/${value.linkedin_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center"
              title={value.linkedin_username}
            >
              <div className="mb-2">
                <RiLinkedinBoxFill className="size-6 text-gray-700 hover:text-gray-900 transition-colors" />
              </div>
              <span className="text-xs text-gray-500">LinkedIn</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function HumanEdit({ form }: { form: ReturnType<typeof useForm<FormSchema>> }) {
  const getInitials = (name: string) => {
    if (!name) {
      return "?";
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const fullName = form.watch("full_name");

  return (
    <div>
      <div className="flex flex-col items-center pb-6">
        <Avatar className="w-24 h-24 mb-3 bg-gray-200">
          <AvatarFallback className="text-xl font-semibold text-gray-600">
            {getInitials(fullName || "?")}
          </AvatarFallback>
        </Avatar>
      </div>

      <Form {...form}>
        <form>
          <div className="border-t border-gray-200 dark:border-zinc-700">
            <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="flex items-center">
                      <div className="w-28 text-sm text-gray-500">Name</div>
                      <FormControl className="flex-1">
                        <Input
                          placeholder="John Doe"
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

            <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="flex items-center">
                      <div className="w-28 text-sm text-gray-500">
                        Job Title
                      </div>
                      <FormControl className="flex-1">
                        <Input
                          placeholder="Software Engineer"
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

            <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
              <div className="w-28 text-sm text-gray-500">Company</div>
              <div className="flex-1">
                <OrganizationSelector form={form} />
              </div>
            </div>

            <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="flex items-center">
                      <div className="w-28 text-sm text-gray-500">Email</div>
                      <FormControl className="flex-1">
                        <Input
                          type="email"
                          placeholder="john@example.com"
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

            <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
              <FormField
                control={form.control}
                name="linkedin_username"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <div className="flex items-center">
                      <div className="w-28 text-sm text-gray-500">LinkedIn</div>
                      <FormControl className="flex-1">
                        <Input
                          placeholder="https://www.linkedin.com/in/johntopia/"
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
          </div>
        </form>
      </Form>
    </div>
  );
}

function OrganizationSelector({
  form,
}: {
  form: ReturnType<typeof useForm<FormSchema>>;
}) {
  const orgId = form.watch("organization_id");
  const [open, setOpen] = useState(false);

  const { data: organization } = useQuery({
    queryKey: ["org", orgId],
    queryFn: () => (orgId ? dbCommands.getOrganization(orgId) : null),
    enabled: !!orgId,
  });

  const handleRemoveOrganization = () => {
    form.setValue("organization_id", null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex flex-row items-center cursor-pointer">
          {organization
            ? (
              <div className="flex items-center">
                <span>{organization.name}</span>
                <span className="ml-2 text-gray-400 group">
                  <CircleMinus
                    className="size-4 cursor-pointer text-gray-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveOrganization();
                    }}
                  />
                </span>
              </div>
            )
            : <span className="text-gray-500">Select organization</span>}
        </div>
      </PopoverTrigger>

      <PopoverContent className="shadow-lg p-3" align="start" side="bottom">
        <OrganizationControl form={form} closePopover={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function OrganizationControl({
  form,
  closePopover,
}: {
  form: ReturnType<typeof useForm<FormSchema>>;
  closePopover: () => void;
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const addOrganizationMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const newOrg = await dbCommands.upsertOrganization({
        id: crypto.randomUUID(),
        name,
        description: null,
      });

      form.setValue("organization_id", newOrg.id);
      return newOrg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organizations"],
      });
      closePopover();
    },
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations", searchTerm],
    queryFn: () => {
      if (!searchTerm) {
        return dbCommands.listOrganizations(null);
      }
      return dbCommands.listOrganizations({ search: [5, searchTerm] });
    },
  });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = searchTerm.trim();
    if (name === "") {
      return;
    }

    addOrganizationMutation.mutate({ name });
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const name = searchTerm.trim();
      if (name === "") {
        return;
      }

      addOrganizationMutation.mutate({ name });
      setSearchTerm("");
    }
  };

  const selectOrganization = (orgId: string) => {
    form.setValue("organization_id", orgId);
    closePopover();
  };

  return (
    <div className="flex flex-col gap-3 max-w-[450px]">
      <div className="text-sm font-medium text-gray-700">Organization</div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center w-full px-2 py-1.5 gap-2 rounded bg-gray-50 border border-gray-200">
            <span className="text-gray-500 flex-shrink-0">
              <SearchIcon className="size-4" />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or add company"
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchTerm.trim() && (
              <button
                type="submit"
                className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                aria-label="Add organization"
              >
                <RiCornerDownLeftLine className="size-4" />
              </button>
            )}
          </div>

          {searchTerm.trim() && (
            <div className="flex flex-col w-full rounded border border-gray-200 overflow-hidden">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors w-full"
                  onClick={() => selectOrganization(org.id)}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-gray-100 rounded-full">
                    <BuildingIcon className="size-3" />
                  </span>
                  <span className="font-medium truncate">{org.name}</span>
                </button>
              ))}

              {organizations.length === 0 && (
                <button
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors w-full"
                  onClick={() => addOrganizationMutation.mutate({ name: searchTerm.trim() })}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-gray-200 rounded-full">
                    <span className="text-xs">+</span>
                  </span>
                  <span className="flex items-center gap-1 font-medium text-gray-600">
                    <Trans>Create</Trans>
                    <span className="text-gray-900 truncate max-w-[140px]">
                      &quot;{searchTerm.trim()}&quot;
                    </span>
                  </span>
                </button>
              )}
            </div>
          )}

          {!searchTerm.trim() && organizations.length > 0 && (
            <div className="flex flex-col w-full rounded border border-gray-200 overflow-hidden max-h-[40vh] overflow-y-auto custom-scrollbar">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  className="flex items-center px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors w-full"
                  onClick={() => selectOrganization(org.id)}
                >
                  <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-gray-100 rounded-full">
                    <BuildingIcon className="size-3" />
                  </span>
                  <span className="font-medium truncate">{org.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
