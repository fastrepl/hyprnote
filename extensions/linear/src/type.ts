// Define priority types based on priority.tsx
export type PriorityType = "NoPriority" | "Urgent" | "High" | "Medium" | "Low";

// Define status types based on status.tsx
export type StatusType =
  | "Backlog"
  | "To Do"
  | "In Progress"
  | "Done"
  | "Canceled"
  | "Duplicate";

export interface Ticket {
  id?: string;
  title: string;
  description: string;
  status: StatusType;
  priority: PriorityType;
  assignee?: string;
  link?: string;
}
