import type { Human, Organization } from "@hypr/plugin-db";

export interface ProfileHeaderProps {
  organization: Organization;
  isEditing: boolean;
  editedOrganization: Organization;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
