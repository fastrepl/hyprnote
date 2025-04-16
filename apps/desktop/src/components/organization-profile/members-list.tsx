import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { getInitials, safeNavigate } from "@hypr/utils";

import type { MembersListProps } from "./types";

export function MembersList({ organizationId }: MembersListProps) {
  const { data: members = [] } = useQuery({
    queryKey: ["org", organizationId, "members"],
    queryFn: () => dbCommands.listOrganizationMembers(organizationId),
  });

  if (members.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Users className="size-5" />
        <Trans>Members</Trans>
        <span className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
          {members.length}
        </span>
      </h2>
      <div className="space-y-2">
        {members.slice(0, 5).map((member) => (
          <button
            key={member.id}
            onClick={() => safeNavigate({ type: "human", value: member.id }, "")}
            className="flex items-center p-2 rounded-md hover:bg-muted w-full text-left"
          >
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback className="text-xs">
                {getInitials(member.full_name || "")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{member.full_name}</p>
              {member.job_title && (
                <p className="text-xs text-muted-foreground">
                  {member.job_title}
                </p>
              )}
            </div>
          </button>
        ))}
        {members.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            <Trans>and {members.length - 5} more members</Trans>
          </p>
        )}
      </div>
    </div>
  );
}
