import "./globals.css";

import { Racing_Sans_One } from "next/font/google";
import type { Metadata } from "next";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

const racingSansOne = Racing_Sans_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-racing-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hyprnote.com"),
  title: "Hyprnote ⚡️ - AI-Powered Meeting Notes",
  description:
    "Transform your meetings with Hyprnote's AI-driven note-taking. Seamlessly combine voice recordings and smart summaries for enhanced productivity.",
  keywords: [
    "AI note-taking",
    "smart meeting summaries",
    "voice-to-text transcription",
    "automated meeting minutes",
    "real-time collaborative notes",
    "conference call recording",
    "intelligent meeting insights",
    "speech recognition for meetings",
    "AI-powered action items",
    "digital meeting assistant",
    "remote team collaboration",
    "meeting productivity tools",
    "AI transcription service",
    "business intelligence from meetings",
  ],
  openGraph: {
    type: "website",
    title: "Hyprnote ⚡️ - AI-Powered Meeting Notes",
    description:
      "Transform your meetings with Hyprnote's AI-driven note-taking. Seamlessly combine voice recordings and smart summaries for enhanced productivity.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Hyprnote AI Note-taking",
      },
    ],
    siteName: "Hyprnote",
  },
  twitter: {
    card: "summary_large_image",
    site: "@hyprnote",
    title: "Hyprnote ⚡️ - AI-Powered Meeting Notes",
    description:
      "Transform your meetings with Hyprnote's AI-driven note-taking. Seamlessly combine voice recordings and smart summaries for enhanced productivity.",
    images: ["/twitter-image.png"],
  },
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#4F46E5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${racingSansOne.variable} antialiased`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
