export const COMPARISON_REVIEWED_ON = "2026-10-15";

export type ComparisonRow = {
  name: string;
  icon?: string;
  url: string;
  paidPlan: string;
  freeTier: string;
  capture: string;
  captureSourceUrl?: string;
};

export const ANARLOG_ROW: ComparisonRow = {
  name: "Anarlog",
  icon: "/icon-192x192.png",
  url: "/",
  paidPlan: "Pro $14/person/month or $140/person/year",
  freeTier: "No app minute cap for local/BYOK; provider charges can apply",
  capture:
    "Bot-free device audio; local SQLite. Transcription and summary providers are independent; hosted AI, sync and sharing have separate data paths.",
  captureSourceUrl: "https://docs.anarlog.so/models-and-providers",
};

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    name: "Otter.ai",
    icon: "/icons/otter.png",
    url: "https://otter.ai/pricing",
    paidPlan: "Pro $8.33/user/month, billed annually",
    freeTier: "300 transcription minutes/month; 3 lifetime file imports",
    capture:
      "Meeting Notetaker or bot-free Mac/Windows device capture. Desktop capture still produces an Otter workspace record.",
    captureSourceUrl:
      "https://help.otter.ai/hc/en-us/articles/35973988280215-Otter-Desktop-App-Mac-Windows",
  },
  {
    name: "Fireflies.ai",
    icon: "/icons/fireflies.png",
    url: "https://fireflies.ai/pricing",
    paidPlan: "Pro $10/seat/month, billed annually",
    freeTier:
      "400 minutes of team storage; limited AI summaries and 20 AI credits",
    capture:
      "Meeting bot plus desktop, mobile and browser capture options. Check the chosen recording method, sharing and export tier.",
  },
  {
    name: "Fathom",
    icon: "/icons/fathom.png",
    url: "https://www.fathom.ai/pricing",
    paidPlan: "Premium $16/user/month, billed annually",
    freeTier:
      "Unlimited recordings/transcripts; 5 advanced summaries/month, then General/Enhanced summaries",
    capture:
      "Meeting bot or bot-free capture in beta for Mac. Confirm beta availability for your account and platform.",
    captureSourceUrl: "https://help.fathom.video/en/articles/5290881",
  },
  {
    name: "Granola",
    icon: "/icons/granola.png",
    url: "https://www.granola.ai/pricing",
    paidPlan: "Business $14/user/month",
    freeTier: "Basic meeting notes with 30 days of visible history",
    capture:
      "Bot-free device-audio capture with notes, chat and shared folders. Device capture does not establish local AI processing.",
  },
  {
    name: "tl;dv",
    icon: "/icons/tldv.png",
    url: "https://tldv.io/",
    paidPlan: "Check current plans",
    freeTier: "Free plan; confirm AI allowances and retention",
    capture:
      "Advertises bot-free capture, clips and shared call libraries. Verify the exact supported client and recording setup.",
    captureSourceUrl: "https://tldv.io/",
  },
  {
    name: "Notta",
    icon: "/icons/notta.png",
    url: "https://www.notta.ai/en/pricing",
    paidPlan: "Pro $8.17/month, billed annually",
    freeTier: "120 cloud transcription minutes/month; 3 minutes per recording",
    capture:
      "Cloud capture modes and Desktop Privacy Mode are different paths. Privacy Mode uses local speech models and storage after setup; this does not establish local AI summaries.",
    captureSourceUrl: "https://www.notta.ai/en/features/privacy-mode",
  },
  {
    name: "Avoma",
    icon: "/icons/avoma.png",
    url: "https://www.avoma.com/pricing",
    paidPlan: "Startup $19/recorder/month, billed annually",
    freeTier: "14-day Organization trial; view-only seats are free",
    capture:
      "Bot-based and native bot-less recording on supported platforms. Recorder seats and free viewers have different permissions.",
  },
  {
    name: "Read AI",
    icon: "/icons/readai.png",
    url: "https://www.read.ai/plans-pricing",
    paidPlan: "Pro $15/user/month, billed annually",
    freeTier: "5 meeting transcripts/month",
    capture:
      "Meeting bot or direct Mac/Windows audio capture. Desktop recordings differ from bot recordings in video and participant analytics.",
    captureSourceUrl:
      "https://support.read.ai/hc/en-us/articles/45911611006995-How-to-Use-Read-s-Desktop-App-for-Windows-and-Mac",
  },
  {
    name: "MeetGeek",
    icon: "/icons/meetgeek.png",
    url: "https://meetgeek.ai/pricing",
    paidPlan: "Check current plans",
    freeTier:
      "3 transcription hours/month; 3 months of transcripts and 1 month of audio storage",
    capture:
      "Bot and bot-free recording through supported browser, desktop and mobile workflows. Check permissions and automatic sharing.",
  },
  {
    name: "Tactiq",
    icon: "/icons/tactiq.png",
    url: "https://tactiq.io/buy",
    paidPlan: "Check current plans and currency",
    freeTier: "10 transcripts and 5 AI credits/month",
    capture:
      "Browser extension plus Mac capture for Zoom, Slack and Teams desktop calls. The help guide has broader coverage than the Zoom-only beta download page.",
    captureSourceUrl:
      "https://help.tactiq.io/en/articles/17447226-how-to-install-the-tactiq-mac-app-for-zoom-slack-and-microsoft-teams",
  },
  {
    name: "Sembly AI",
    icon: "/icons/sembly.png",
    url: "https://www.sembly.ai/pricing/",
    paidPlan: "Basic $10/month, billed annually",
    freeTier: "Free trial; check current credit allowance",
    capture:
      "The documented meeting-agent workflow joins as an attendee. Confirm recording and workspace sharing before inviting it.",
    captureSourceUrl:
      "https://help.sembly.ai/en/articles/68-immediate-sembly-invite",
  },
];
