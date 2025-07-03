import { appDataDir } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import { jsPDF } from "jspdf";

import { commands as dbCommands, type Event, type Human, type Session } from "@hypr/plugin-db";

export type SessionData = Session & {
  participants?: Human[];
  event?: Event | null;
};

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  isHeader?: number; // 1, 2, 3 for h1, h2, h3
  isListItem?: boolean;
}

// TODO:
// 1. Tiptap already has structured output - toJSON(). Should be cleaner than htmlToStructuredText.
// 2. Fetch should happen outside. This file should be only do the rendering. (Ideally writeFile should be happened outside too)
// 3. exportToPDF should be composed with multiple steps.

const htmlToStructuredText = (html: string): TextSegment[] => {
  if (!html) {
    return [];
  }

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const segments: TextSegment[] = [];

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        segments.push({ text });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      switch (tagName) {
        case "h1":
          segments.push({ text: element.textContent || "", isHeader: 1 });
          break;
        case "h2":
          segments.push({ text: element.textContent || "", isHeader: 2 });
          break;
        case "h3":
          segments.push({ text: element.textContent || "", isHeader: 3 });
          break;
        case "strong":
        case "b":
          segments.push({ text: element.textContent || "", bold: true });
          break;
        case "em":
        case "i":
          segments.push({ text: element.textContent || "", italic: true });
          break;
        case "li":
          segments.push({ text: `• ${element.textContent || ""}`, isListItem: true });
          break;
        case "p":
          if (element.textContent?.trim()) {
            // Process inline formatting within paragraphs
            processInlineFormatting(element, segments);
            segments.push({ text: "\n" }); // Add paragraph break
          }
          break;
        case "br":
          segments.push({ text: "\n" });
          break;
        default:
          // For other elements, process children
          Array.from(node.childNodes).forEach(processNode);
          break;
      }
    }
  };

  const processInlineFormatting = (element: Element, segments: TextSegment[]) => {
    Array.from(element.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || "";
        if (text.trim()) {
          segments.push({ text });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childElement = child as Element;
        const tagName = childElement.tagName.toLowerCase();
        const text = childElement.textContent || "";

        if (text.trim()) {
          switch (tagName) {
            case "strong":
            case "b":
              segments.push({ text, bold: true });
              break;
            case "em":
            case "i":
              segments.push({ text, italic: true });
              break;
            default:
              segments.push({ text });
              break;
          }
        }
      }
    });
  };

  Array.from(tempDiv.childNodes).forEach(processNode);
  return segments;
};

// Split text into lines that fit within the PDF width
const splitTextToLines = (text: string, pdf: jsPDF, maxWidth: number): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = pdf.getTextWidth(testLine);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

// Fetch additional session data (participants and event info)
const fetchSessionMetadata = async (sessionId: string): Promise<{ participants: Human[]; event: Event | null }> => {
  try {
    const [participants, event] = await Promise.all([
      dbCommands.sessionListParticipants(sessionId),
      dbCommands.sessionGetEvent(sessionId),
    ]);
    return { participants, event };
  } catch (error) {
    console.error("Failed to fetch session metadata:", error);
    return { participants: [], event: null };
  }
};

export const exportToPDF = async (session: SessionData): Promise<string> => {
  const { participants, event } = await fetchSessionMetadata(session.id);

  // Generate filename
  const filename = session?.title
    ? `${session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`
    : `note_${new Date().toISOString().split("T")[0]}.pdf`;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  const lineHeight = 6;

  let yPosition = margin;

  // Add title with text wrapping
  const title = session?.title || "Untitled Note";
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0); // Black

  // Split title into multiple lines if it's too long
  const titleLines = splitTextToLines(title, pdf, maxWidth);

  for (const titleLine of titleLines) {
    pdf.text(titleLine, margin, yPosition);
    yPosition += lineHeight;
  }
  yPosition += lineHeight; // Extra space after title

  // Add creation date ONLY if there's no event info
  if (!event && session?.created_at) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100); // Gray
    const createdAt = `Created: ${new Date(session.created_at).toLocaleDateString()}`;
    pdf.text(createdAt, margin, yPosition);
    yPosition += lineHeight;
  }

  // Add event info if available
  if (event) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100); // Gray

    // Event name
    if (event.name) {
      pdf.text(`Event: ${event.name}`, margin, yPosition);
      yPosition += lineHeight;
    }

    // Event date/time
    if (event.start_date) {
      const startDate = new Date(event.start_date);
      const endDate = event.end_date ? new Date(event.end_date) : null;

      let dateText = `Date: ${startDate.toLocaleDateString()}`;
      if (endDate && startDate.toDateString() !== endDate.toDateString()) {
        dateText += ` - ${endDate.toLocaleDateString()}`;
      }

      pdf.text(dateText, margin, yPosition);
      yPosition += lineHeight;

      // Time
      const timeText = endDate
        ? `Time: ${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${
          endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }`
        : `Time: ${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      pdf.text(timeText, margin, yPosition);
      yPosition += lineHeight;
    }
  }

  // Add participants if available
  if (participants && participants.length > 0) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100); // Gray

    const participantNames = participants
      .filter(p => p.full_name)
      .map(p => p.full_name)
      .join(", ");

    if (participantNames) {
      const participantText = `Participants: ${participantNames}`;
      const participantLines = splitTextToLines(participantText, pdf, maxWidth);

      for (const line of participantLines) {
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      }
    }
  }

  // Add attribution with clickable "Hyprnote"
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100); // Gray
  pdf.text("Summarized by ", margin, yPosition);

  // Calculate width of "Summarized by " to position "Hyprnote"
  const madeByWidth = pdf.getTextWidth("Summarized by ");
  pdf.setTextColor(37, 99, 235); // Blue color for Hyprnote

  // Create clickable link for Hyprnote
  const hyprnoteText = "Hyprnote";
  pdf.textWithLink(hyprnoteText, margin + madeByWidth, yPosition, { url: "https://www.hyprnote.com" });

  yPosition += lineHeight * 2;

  // Add separator line
  pdf.setDrawColor(200, 200, 200); // Light gray line
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight;

  // Convert HTML to structured text and add content
  const segments = htmlToStructuredText(session?.enhanced_memo_html || "No content available");

  for (const segment of segments) {
    // Check if we need a new page
    if (yPosition > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    // Set font style based on segment properties
    if (segment.isHeader) {
      const headerSizes = { 1: 14, 2: 13, 3: 12 };
      pdf.setFontSize(headerSizes[segment.isHeader as keyof typeof headerSizes]);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0); // Black for headers
      yPosition += lineHeight; // Extra space before headers
    } else {
      pdf.setFontSize(12);
      const fontStyle = segment.bold && segment.italic
        ? "bolditalic"
        : segment.bold
        ? "bold"
        : segment.italic
        ? "italic"
        : "normal";
      pdf.setFont("helvetica", fontStyle);
      pdf.setTextColor(50, 50, 50); // Dark gray for content
    }

    // Handle list items with indentation
    const xPosition = segment.isListItem ? margin + 5 : margin;

    // Split long text into multiple lines
    const lines = splitTextToLines(segment.text, pdf, maxWidth - (segment.isListItem ? 5 : 0));

    for (let i = 0; i < lines.length; i++) {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.text(lines[i], xPosition, yPosition);
      yPosition += lineHeight;
    }

    // Add extra space after headers and paragraphs
    if (segment.isHeader || segment.text === "\n") {
      yPosition += lineHeight * 0.5;
    }
  }

  const pdfArrayBuffer = pdf.output("arraybuffer");
  const uint8Array = new Uint8Array(pdfArrayBuffer);

  const downloadsPath = await appDataDir();
  const filePath = downloadsPath.endsWith("/")
    ? `${downloadsPath}${filename}`
    : `${downloadsPath}/${filename}`;

  await writeFile(filePath, uint8Array);
  return filePath;
};
