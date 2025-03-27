import { Human, Organization } from "@hypr/plugin-db";

export interface HumanProfileProps {
  human: Human;
  organization: Organization | null;
}

export interface ContactInfoProps {
  human: Human;
  organization: Organization | null;
  isEditing: boolean;
  editedHuman: Human;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  getOrganizationWebsite: () => string | null;
}

export interface ProfileHeaderProps {
  human: Human;
  organization: Organization | null;
  isEditing: boolean;
  editedHuman: Human;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setEditedHuman: React.Dispatch<React.SetStateAction<Human>>;
  orgSearchQuery: string;
  setOrgSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showOrgSearch: boolean;
  setShowOrgSearch: React.Dispatch<React.SetStateAction<boolean>>;
  orgSearchResults: Organization[];
  orgSearchRef: React.RefObject<HTMLDivElement>;
}

export interface EditButtonProps {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  onSave: () => void;
}

export interface UpcomingEventsProps {
  human: Human;
}

export interface PastNotesProps {
  human: Human;
}
