import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, CircleMinus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { commands as dbCommands, Human, type Organization } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Input } from "@hypr/ui/components/ui/input";
import { getInitials } from "@hypr/utils";

export function ProfileHeader({
  isEditing,
  human,
  organization,
}: {
  isEditing: boolean;
  human: Human;
  organization: Organization | null;
}) {
  const queryClient = useQueryClient();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  const orgSearchResults: Organization[] = [];
  const orgSearchRef = useRef<HTMLDivElement>(null);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [showOrgSearch, setShowOrgSearch] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgSearchRef.current && !orgSearchRef.current.contains(event.target as Node)) {
        setShowOrgSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [orgSearchRef, setShowOrgSearch]);

  const humanQuery = useQuery({
    initialData: human,
    queryKey: ["human", human.id],
    queryFn: () => dbCommands.getHuman(human.id),
  });

  const updateOrgOfHuman = useMutation({
    mutationFn: ({ organizationId }: { organizationId: string | null }) => {
      const newHuman = { ...human, organization_id: organizationId };
      return dbCommands.upsertHuman(newHuman);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["human", human.id], data);
    },
  });

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-24 w-24">
        <AvatarFallback className="text-xl font-medium">
          {getInitials(human.full_name || "")}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-start gap-1">
        {isEditing
          ? (
            <div className="w-full space-y-2">
              <Input
                id="full_name"
                name="full_name"
                value={humanQuery.data?.full_name || ""}
                onChange={handleInputChange}
                placeholder="Full Name"
                className="text-lg font-medium border-none shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Input
                id="job_title"
                name="job_title"
                value={humanQuery.data?.job_title || ""}
                onChange={handleInputChange}
                placeholder="Job Title"
                className="text-sm border-none shadow-none px-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <div className="flex items-center gap-2">
                {organization
                  ? (
                    <div className="flex items-center gap-2 w-full">
                      <div className="text-sm text-gray-700 flex-1">{organization.name}</div>
                      <button
                        type="button"
                        onClick={() => updateOrgOfHuman.mutate({ organizationId: null })}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <CircleMinus className="size-4" />
                      </button>
                    </div>
                  )
                  : (
                    <div className="w-full" ref={orgSearchRef}>
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={"orgSearchQuery"}
                          onChange={(e) => {
                            setOrgSearchQuery(e.target.value);
                            setShowOrgSearch(true);
                          }}
                          onFocus={() => setShowOrgSearch(true)}
                          placeholder="Organization"
                          className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400 border-none shadow-none px-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>

                      {showOrgSearch && orgSearchQuery.trim() && (
                        <div className="relative">
                          <div className="absolute z-10 w-full mt-1 bg-white rounded-md border border-border overflow-hidden">
                            {orgSearchResults?.length > 0 && (
                              <div className="max-h-60 overflow-auto">
                                {orgSearchResults.map((org) => (
                                  <button
                                    key={org.id}
                                    type="button"
                                    className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
                                    onClick={() => {
                                      updateOrgOfHuman.mutate({ organizationId: org.id });
                                      setOrgSearchQuery("");
                                      setShowOrgSearch(false);
                                    }}
                                  >
                                    <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-blue-100 text-blue-600 rounded-full">
                                      <Building className="size-3" />
                                    </span>
                                    <span className="font-medium text-neutral-900 truncate">{org.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {(!orgSearchResults?.length) && (
                              <button
                                type="button"
                                className="flex items-center px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors w-full"
                                onClick={async () => {
                                  try {
                                    const newOrg: Organization = {
                                      id: crypto.randomUUID(),
                                      name: orgSearchQuery.trim(),
                                      description: null,
                                    };

                                    await dbCommands.upsertOrganization(newOrg);
                                    updateOrgOfHuman.mutate({ organizationId: newOrg.id });

                                    setOrgSearchQuery("");
                                    setShowOrgSearch(false);
                                  } catch (error) {
                                    console.error("Failed to create organization:", error);
                                  }
                                }}
                              >
                                <span className="flex-shrink-0 size-5 flex items-center justify-center mr-2 bg-neutral-200 rounded-full">
                                  <Plus className="size-3" />
                                </span>
                                <span className="flex items-center gap-1 font-medium text-neutral-600">
                                  <Trans>Create</Trans>
                                  <span className="text-neutral-900 truncate max-w-[140px]">
                                    &quot;{orgSearchQuery.trim()}&quot;
                                  </span>
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          )
          : (
            <>
              <h1 className="text-lg font-medium">
                {human.full_name || <Trans>Unnamed Contact</Trans>}
              </h1>
              {human.job_title && <div className="text-sm text-gray-700">{human.job_title}</div>}
            </>
          )}
        {organization && !isEditing && (
          <button
            className="text-sm font-medium text-gray-700 flex items-center gap-1 hover:scale-95 transition-all hover:text-neutral-900"
            onClick={() => windowsCommands.windowShow({ type: "organization", value: organization.id })}
          >
            <Building size={14} />
            {organization.name}
          </button>
        )}
      </div>
    </div>
  );
}
