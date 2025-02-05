import { type Participant } from "@/types/tauri.gen";

export const mockParticipants: Participant[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    color_hex: "#FF5733",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    color_hex: "#33FF57",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    color_hex: "#3357FF",
  },
  {
    id: "4",
    name: "Alice Brown",
    email: "alice.brown@example.com",
    color_hex: "#FF33F6",
  },
  {
    id: "5",
    name: "Charlie Wilson",
    email: "charlie.wilson@example.com",
    color_hex: "#33FFF6",
  },
];
