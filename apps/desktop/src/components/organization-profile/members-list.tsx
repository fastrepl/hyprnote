import { Trans } from "@lingui/react/macro";
import { RiLinkedinBoxFill, RiMailLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { getInitials } from "@hypr/utils";

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
      <h2 className="mb-4 flex items-center justify-center gap-2 font-semibold">
        <Users className="size-5" />
        <Trans>Members</Trans>
        <span className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
          {members.length}
        </span>
      </h2>

      <table className="w-full border-collapse max-w-xs mx-auto">
        <tbody>
          {members.slice(0, 5).map((member) => (
            <tr
              key={member.id}
              className="hover:bg-muted border-b border-gray-100 last:border-b-0"
            >
              <td
                className="py-2 pl-2 pr-1 w-12 cursor-pointer"
                onClick={() =>
                  windowsCommands.windowShow({
                    type: "human",
                    value: member.id,
                  })}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.full_name || "")}
                  </AvatarFallback>
                </Avatar>
              </td>
              <td
                className="py-2 px-1 cursor-pointer"
                onClick={() =>
                  windowsCommands.windowShow({
                    type: "human",
                    value: member.id,
                  })}
              >
                <p className="text-sm font-medium">{member.full_name}</p>
                {member.job_title && (
                  <p className="text-xs text-muted-foreground">
                    {member.job_title}
                  </p>
                )}
              </td>
              <td className="py-2 px-1 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-2">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      title={member.email}
                    >
                      <RiMailLine className="size-5" />
                    </a>
                  )}
                  {member.linkedin_username && (
                    <a
                      href={`https://linkedin.com/in/${member.linkedin_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      title={member.linkedin_username}
                    >
                      <RiLinkedinBoxFill className="size-5" />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {members.length > 5 && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          <Trans>and {members.length - 5} more members</Trans>
        </p>
      )}
    </div>
  );
}
