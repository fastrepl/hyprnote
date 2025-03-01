import type { Ticket } from "./type";

export const mockNewTickets: Ticket[] = [
  {
    title: "Implement authentication flow for mobile app",
    description:
      "Create a secure authentication flow that includes login, signup, and password recovery for the mobile application.",
    status: "In Progress",
    priority: "High",
    assignee: "Sarah Kim",
  },
  {
    title: "Fix rendering bug in dashboard charts",
    description:
      "Charts in the analytics dashboard are not rendering correctly on Firefox browsers. Need to investigate and fix cross-browser compatibility issues.",
    status: "To Do",
    priority: "Medium",
    assignee: "Alex Chen",
  },
  {
    title: "Optimize database queries for user profile page",
    description:
      "The user profile page is loading slowly due to inefficient database queries. Need to refactor and optimize for better performance.",
    status: "In Progress",
    priority: "Medium",
    assignee: "David Park",
  },
];

export const mockRelatedTickets: Ticket[] = [
  {
    id: "LIN-972",
    title: "Add dark mode support to settings panel",
    description:
      "Implement dark mode theme for the settings panel to match the rest of the application's theming capabilities.",
    status: "Done",
    priority: "Low",
    assignee: "Emma Johnson",
    link: "https://linear.app/company/issue/LIN-972",
  },
  {
    id: "LIN-1051",
    title: "Security vulnerability in file upload service",
    description:
      "Critical security vulnerability discovered in the file upload service that could allow unauthorized access to user files. Needs immediate attention.",
    status: "To Do",
    priority: "Urgent",
    assignee: "Michael Wong",
    link: "https://linear.app/company/issue/LIN-1051",
  },
  {
    id: "LIN-1038",
    title: "Improve accessibility for form components",
    description:
      "Our form components need improvements to meet WCAG 2.1 AA standards. Focus on keyboard navigation, screen reader support, and proper ARIA attributes.",
    status: "In Progress",
    priority: "High",
    assignee: "Olivia Martinez",
    link: "https://linear.app/company/issue/LIN-1038",
  },
  {
    id: "LIN-995",
    title: "Create onboarding tutorial for new users",
    description:
      "Design and implement an interactive onboarding tutorial to help new users understand key features of the platform.",
    status: "Backlog",
    priority: "Medium",
    assignee: "Unassigned",
    link: "https://linear.app/company/issue/LIN-995",
  },
];
