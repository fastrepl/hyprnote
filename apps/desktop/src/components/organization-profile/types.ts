import type { Human, Organization } from "@hypr/plugin-db";

export interface OrganizationProfileProps {
  organization: Organization;
}

export interface ProfileHeaderProps {
  organization: Organization;
  isEditing: boolean;
  editedOrganization: Organization;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export interface EditButtonProps {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  onSave: () => void;
}

export interface MembersListProps {
  organizationId: string;
}

export interface UpcomingEventsProps {
  organizationId: string;
  members: Human[];
}

export interface RecentNotesProps {
  organizationId: string;
  members: Human[];
}
