import { Trans } from "@lingui/react/macro";

import { Avatar, AvatarFallback } from "@hypr/ui/components/ui/avatar";
import { Input } from "@hypr/ui/components/ui/input";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { getInitials } from "@hypr/utils";

import type { ProfileHeaderProps } from "./types";

export function ProfileHeader({
  organization,
  isEditing,
  editedOrganization,
  handleInputChange,
}: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarFallback className="text-xl font-medium bg-blue-100 text-blue-600">
            {getInitials(organization.name || "")}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex flex-col items-start gap-1">
        {isEditing
          ? (
            <div className="w-full">
              <Input
                id="name"
                name="name"
                value={editedOrganization.name || ""}
                onChange={handleInputChange}
                placeholder="Organization Name"
                className="text-lg font-medium border-none shadow-none px-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Textarea
                id="description"
                name="description"
                value={editedOrganization.description || ""}
                onChange={handleInputChange}
                placeholder="Organization Description"
                className="text-sm border-none shadow-none px-0 min-h-[60px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          )
          : (
            <>
              <h1 className="text-lg font-medium">
                {organization.name || <Trans>Unnamed Organization</Trans>}
              </h1>
              {organization.description && <div className="text-sm text-gray-700">{organization.description}</div>}
            </>
          )}
      </div>
    </div>
  );
}
