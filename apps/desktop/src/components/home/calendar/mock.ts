import { type Event } from "@hypr/plugin-db";

export const mockEvents: Event[] = [
  {
    id: "1",
    user_id: "user1",
    tracking_id: "track1",
    calendar_id: "cal1",
    name: "Team Meeting",
    note: "Weekly sync with the team",
    start_date: new Date(
      new Date().setDate(new Date().getDate() - 2),
    ).toISOString(),
    end_date: new Date(
      new Date().setDate(new Date().getDate() - 2),
    ).toISOString(),
    google_event_url: null,
  },
  {
    id: "2",
    user_id: "user1",
    tracking_id: "track2",
    calendar_id: "cal1",
    name: "Project Review",
    note: "Review Q1 progress",
    start_date: new Date(
      new Date().setDate(new Date().getDate() + 1),
    ).toISOString(),
    end_date: new Date(
      new Date().setDate(new Date().getDate() + 1),
    ).toISOString(),
    google_event_url: null,
  },
  {
    id: "3",
    user_id: "user1",
    tracking_id: "track3",
    calendar_id: "cal1",
    name: "Client Call",
    note: "Monthly check-in",
    start_date: new Date(
      new Date().setDate(new Date().getDate() + 3),
    ).toISOString(),
    end_date: new Date(
      new Date().setDate(new Date().getDate() + 3),
    ).toISOString(),
    google_event_url: null,
  },
  {
    id: "4",
    user_id: "user1",
    tracking_id: "track4",
    calendar_id: "cal1",
    name: "Planning",
    note: "Sprint planning",
    start_date: new Date(
      new Date().setDate(new Date().getDate() + 5),
    ).toISOString(),
    end_date: new Date(
      new Date().setDate(new Date().getDate() + 5),
    ).toISOString(),
    google_event_url: null,
  },
  {
    id: "5",
    user_id: "user1",
    tracking_id: "track5",
    calendar_id: "cal1",
    name: "Training",
    note: "New tool training",
    start_date: new Date(
      new Date().setDate(new Date().getDate() + 7),
    ).toISOString(),
    end_date: new Date(
      new Date().setDate(new Date().getDate() + 7),
    ).toISOString(),
    google_event_url: null,
  },
];
