import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EditButton, MembersList, ProfileHeader, RecentNotes, UpcomingEvents } from "@/components/organization-profile";
import { useEditMode } from "@/contexts/edit-mode-context";
import { commands as dbCommands } from "@hypr/plugin-db";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

export const Route = createFileRoute("/app/organization/$id")({
  component: Component,
  loader: async ({ context: { queryClient }, params }) => {
    const organization = await queryClient.fetchQuery({
      queryKey: ["organization", params.id],
      queryFn: () => dbCommands.getOrganization(params.id),
    });

    if (!organization) {
      throw notFound();
    }

    return { organization };
  },
});

function Component() {
  const { organization } = Route.useLoaderData();
  const { isEditing, setIsEditing } = useEditMode();
  const [editedOrganization, setEditedOrganization] = useState(organization);
  const queryClient = useQueryClient();

  const isMain = getCurrentWebviewWindowLabel() === "main";

  useEffect(() => {
    const preventBackNavigation = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "ArrowLeft") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", preventBackNavigation);
    return () => {
      window.removeEventListener("keydown", preventBackNavigation);
    };
  }, []);

  const { data: members = [] } = useQuery({
    queryKey: ["organization", organization.id, "members"],
    queryFn: () => dbCommands.listOrganizationMembers(organization.id),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedOrganization(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    try {
      dbCommands.upsertOrganization(editedOrganization);
      queryClient.invalidateQueries({ queryKey: ["organization", organization.id] });
    } catch (error) {
      console.error("Failed to update organization:", error);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      handleSave();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditedOrganization(organization);
  }, [organization]);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1">
        <main className="flex h-full overflow-auto bg-white relative">
          {isMain && (
            <div className="absolute top-4 right-4 z-10">
              <EditButton
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                onSave={handleSave}
              />
            </div>
          )}
          <div className="max-w-lg mx-auto px-4 lg:px-6 pt-6 pb-20">
            <div className="mb-6 flex flex-col items-center gap-8">
              <ProfileHeader
                organization={organization}
                isEditing={isEditing}
                editedOrganization={editedOrganization}
                handleInputChange={handleInputChange}
              />

              <div className="flex justify-center gap-4">
              </div>
            </div>

            <MembersList organizationId={organization.id} />
            <UpcomingEvents organizationId={organization.id} members={members} />
            <RecentNotes organizationId={organization.id} members={members} />
          </div>
        </main>
      </div>
    </div>
  );
}
