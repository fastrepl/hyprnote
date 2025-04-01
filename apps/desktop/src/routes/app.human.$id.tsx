import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { ContactInfo, EditButton, PastNotes, ProfileHeader, UpcomingEvents } from "@/components/human-profile";
import { useEditMode } from "@/contexts/edit-mode-context";
import { commands as dbCommands, type Human } from "@hypr/plugin-db";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { extractWebsiteUrl } from "@hypr/utils";

export const Route = createFileRoute("/app/human/$id")({
  component: Component,
  loader: async ({ context: { queryClient }, params }) => {
    const human = await queryClient.fetchQuery({
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
      queryKey: ["organization", human.organization_id],
      queryFn: () => dbCommands.getOrganization(human.organization_id!),
    });

    return { human, organization };
  },
});

function Component() {
  const { human, organization } = Route.useLoaderData();
  const { isEditing, setIsEditing } = useEditMode();
  const [editedHuman, setEditedHuman] = useState<Human>(human);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [showOrgSearch, setShowOrgSearch] = useState(false);
  const queryClient = useQueryClient();
  const orgSearchRef = useRef<HTMLDivElement>(null);

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

  const getOrganizationWebsite = () => {
    return organization ? extractWebsiteUrl(human.email) : null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedHuman(prev => ({ ...prev, [name]: value }));
  };

  const { data: orgSearchResults = [] } = useQuery({
    queryKey: ["search-organizations", orgSearchQuery],
    queryFn: async () => {
      if (!orgSearchQuery.trim()) {
        return [];
      }
      return dbCommands.listOrganizations({ search: [4, orgSearchQuery] });
    },
    enabled: !!orgSearchQuery.trim() && showOrgSearch,
  });

  const handleSave = () => {
    try {
      dbCommands.upsertHuman(editedHuman);

      queryClient.invalidateQueries({ queryKey: ["human", human.id] });
    } catch (error) {
      console.error("Failed to update human:", error);
    }
  };

  useEffect(() => {
    if (!isEditing) {
      handleSave();
    }
  }, [isEditing, editedHuman, human.id, queryClient]);

  useEffect(() => {
    setEditedHuman(human);
  }, [human]);

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
                human={human}
                organization={organization}
                isEditing={isEditing}
                editedHuman={editedHuman}
                handleInputChange={handleInputChange}
                setEditedHuman={setEditedHuman}
                orgSearchQuery={orgSearchQuery}
                setOrgSearchQuery={setOrgSearchQuery}
                showOrgSearch={showOrgSearch}
                setShowOrgSearch={setShowOrgSearch}
                orgSearchResults={orgSearchResults}
                orgSearchRef={orgSearchRef}
              />

              <ContactInfo
                human={human}
                organization={organization}
                isEditing={isEditing}
                editedHuman={editedHuman}
                handleInputChange={handleInputChange}
                getOrganizationWebsite={getOrganizationWebsite}
              />
            </div>
            <UpcomingEvents human={human} />
            <PastNotes human={human} />
          </div>
        </main>
      </div>
    </div>
  );
}
