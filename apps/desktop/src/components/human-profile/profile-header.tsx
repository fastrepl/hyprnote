import { Trans } from "@lingui/react/macro";
import { Building, CircleMinus, Plus } from "lucide-react";
import { useEffect } from "react";

import { commands as dbCommands, type Organization } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Input } from "@hypr/ui/components/ui/input";
import { getInitials } from "@hypr/utils";

import type { ProfileHeaderProps } from "./types";

export function ProfileHeader({
  human,
  organization,
  isEditing,
  editedHuman,
  handleInputChange,
  setEditedHuman,
  orgSearchQuery,
  setOrgSearchQuery,
  showOrgSearch,
  setShowOrgSearch,
  orgSearchResults,
  orgSearchRef,
}: ProfileHeaderProps) {
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
                value={editedHuman.full_name || ""}
                onChange={handleInputChange}
                placeholder="Full Name"
                className="text-lg font-medium border-none shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Input
                id="job_title"
                name="job_title"
                value={editedHuman.job_title || ""}
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
                        onClick={() => {
                          setEditedHuman(prev => ({ ...prev, organization_id: null }));
                        }}
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
                          value={orgSearchQuery}
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
                                      setEditedHuman(prev => ({ ...prev, organization_id: org.id }));
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

                                    setEditedHuman(prev => ({ ...prev, organization_id: newOrg.id }));

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
            onClick={() => windowsCommands.windowShow({ organization: organization.id })}
          >
            <Building size={14} />
            {organization.name}
          </button>
        )}
      </div>
    </div>
  );
}
