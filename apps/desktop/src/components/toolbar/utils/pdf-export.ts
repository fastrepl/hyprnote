import { downloadDir } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import { jsPDF } from "jspdf";

import { commands as dbCommands, type Event, type Human, type Session } from "@hypr/plugin-db";
import { getPDFTheme, type ThemeName } from "./pdf-themes";

export { getAvailableThemes, getPDFTheme, type PDFTheme, type ThemeName } from "./pdf-themes";

export type SessionData = Session & {
  participants?: Human[];
  event?: Event | null;
};

interface TextSegment {
  text: string;
  isHeader?: number;
  isListItem?: boolean;
  listType?: "ordered" | "unordered";
  listLevel?: number;
  listItemNumber?: number;
  bulletType?: "filled-circle" | "hollow-circle" | "square" | "triangle";
}

interface ListContext {
  type: "ordered" | "unordered";
  level: number;
  counters: number[];
}

const getOrderedListMarker = (counter: number, level: number): string => {
  switch (level) {
    case 0:
      return `${counter}.`;
    case 1:
      return `${String.fromCharCode(96 + counter)}.`;
    default:
      return `${toRomanNumeral(counter)}.`;
  }
};

const toRomanNumeral = (num: number): string => {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const numerals = ["m", "cm", "d", "cd", "c", "xc", "l", "xl", "x", "ix", "v", "iv", "i"];

  let result = "";
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += numerals[i];
      num -= values[i];
    }
  }
  return result;
};

const htmlToStructuredText = (html: string): TextSegment[] => {
  if (!html) {
    return [];
  }

  const cleanedHtml = html
    .replace(/<\/?strong>/gi, "")
    .replace(/<\/?b>/gi, "")
    .replace(/<\/?em>/gi, "")
    .replace(/<\/?i>/gi, "");

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleanedHtml;

  const segments: TextSegment[] = [];
  const listStack: ListContext[] = [];

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

        case "ul":
          processListContainer(element, "unordered");
          break;
        case "ol":
          processListContainer(element, "ordered");
          break;
        case "li":
          processListItem(element);
          break;

        case "p":
          if (element.textContent?.trim()) {
            processInlineFormatting(element, segments);
            segments.push({ text: "\n" });
          }
          break;
        case "br":
          segments.push({ text: "\n" });
          break;
        default:
          Array.from(node.childNodes).forEach(processNode);
          break;
      }
    }
  };

  const processListContainer = (listElement: Element, type: "ordered" | "unordered") => {
    const level = listStack.length;

    const counters = [...(listStack[listStack.length - 1]?.counters || [])];
    if (counters.length <= level) {
      counters[level] = 0;
    }

    listStack.push({ type, level, counters });

    Array.from(listElement.children).forEach((child, index) => {
      if (child.tagName.toLowerCase() === "li") {
        if (type === "ordered") {
          counters[level] = index + 1;
        }
        processNode(child);
      }
    });

    listStack.pop();

    if (level === 0) {
      segments.push({ text: "\n" });
    }
  };

  const processListItem = (liElement: Element) => {
    const currentList = listStack[listStack.length - 1];
    if (!currentList) {
      return;
    }

    const { type, level, counters } = currentList;

    const textContent = getListItemText(liElement);

    const bulletTypes = ["filled-circle", "hollow-circle", "square"] as const;

    segments.push({
      text: type === "ordered"
        ? `${getOrderedListMarker(counters[level], level)} ${textContent}`
        : textContent,
      isListItem: true,
      listType: type,
      listLevel: level,
      listItemNumber: type === "ordered" ? counters[level] : undefined,
      bulletType: type === "unordered"
        ? (level <= 2 ? bulletTypes[level] : "square")
        : undefined,
    });

    Array.from(liElement.children).forEach(child => {
      if (child.tagName.toLowerCase() === "ul" || child.tagName.toLowerCase() === "ol") {
        processNode(child);
      }
    });
  };

  const getListItemText = (liElement: Element): string => {
    let text = "";
    for (const child of liElement.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent || "";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        if (!["ul", "ol"].includes(element.tagName.toLowerCase())) {
          text += element.textContent || "";
        }
      }
    }
    return text.trim();
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
        const text = childElement.textContent || "";

        if (text.trim()) {
          segments.push({ text });
        }
      }
    });
  };

  Array.from(tempDiv.childNodes).forEach(processNode);
  return segments;
};

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

const drawVectorBullet = (
  pdf: jsPDF,
  bulletType: "filled-circle" | "hollow-circle" | "square" | "triangle",
  x: number,
  y: number,
  size: number = 1.0,
  color: readonly [number, number, number] = [50, 50, 50], // Accept color parameter
) => {
  // Save current state
  const currentFillColor = pdf.getFillColor();
  const currentDrawColor = pdf.getDrawColor();

  pdf.setFillColor(...color);
  pdf.setDrawColor(...color);
  pdf.setLineWidth(0.2);

  const bulletY = y - (size / 2);

  switch (bulletType) {
    case "filled-circle":
      pdf.circle(x, bulletY, size * 0.85, "F");
      break;

    case "hollow-circle":
      pdf.circle(x, bulletY, size * 0.85, "S");
      break;

    case "square":
      const squareSize = size * 1.4;
      pdf.rect(
        x - squareSize / 2,
        bulletY - squareSize / 2,
        squareSize,
        squareSize,
        "F",
      );
      break;

    case "triangle":
      const triangleSize = size * 1.15;
      pdf.triangle(
        x,
        bulletY - triangleSize / 2, // top point
        x - triangleSize / 2,
        bulletY + triangleSize / 2, // bottom left
        x + triangleSize / 2,
        bulletY + triangleSize / 2, // bottom right
        "F",
      );
      break;
  }

  pdf.setFillColor(currentFillColor);
  pdf.setDrawColor(currentDrawColor);
};

export const exportToPDF = async (
  session: SessionData,
  themeName: ThemeName = "default",
): Promise<string> => {
  const { participants, event } = await fetchSessionMetadata(session.id);

  const PDF_STYLES = getPDFTheme(themeName);

  const filename = session?.title
    ? `${session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`
    : `note_${new Date().toISOString().split("T")[0]}.pdf`;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  const lineHeight = 5.5;

  const applyBackgroundColor = () => {
    if (
      PDF_STYLES.colors.background[0] !== 255
      || PDF_STYLES.colors.background[1] !== 255
      || PDF_STYLES.colors.background[2] !== 255
    ) {
      pdf.setFillColor(...PDF_STYLES.colors.background);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
    }
  };

  const addNewPage = () => {
    pdf.addPage();
    applyBackgroundColor();
  };

  let yPosition = margin;

  applyBackgroundColor();

  const title = session?.title || "Untitled Note";
  pdf.setFontSize(16);
  pdf.setFont(PDF_STYLES.font, "bold");
  pdf.setTextColor(...PDF_STYLES.colors.headers);

  const titleLines = splitTextToLines(title, pdf, maxWidth);

  for (const titleLine of titleLines) {
    pdf.text(titleLine, margin, yPosition);
    yPosition += lineHeight;
  }
  yPosition += lineHeight;

  if (!event && session?.created_at) {
    pdf.setFontSize(10);
    pdf.setFont(PDF_STYLES.font, "normal");
    pdf.setTextColor(...PDF_STYLES.colors.metadata);
    const createdAt = `Created: ${new Date(session.created_at).toLocaleDateString()}`;
    pdf.text(createdAt, margin, yPosition);
    yPosition += lineHeight;
  }

  if (event) {
    pdf.setFontSize(10);
    pdf.setFont(PDF_STYLES.font, "normal");
    pdf.setTextColor(...PDF_STYLES.colors.metadata); // Use metadata color

    if (event.name) {
      pdf.text(`Event: ${event.name}`, margin, yPosition);
      yPosition += lineHeight;
    }

    if (event.start_date) {
      const startDate = new Date(event.start_date);
      const endDate = event.end_date ? new Date(event.end_date) : null;

      let dateText = `Date: ${startDate.toLocaleDateString()}`;
      if (endDate && startDate.toDateString() !== endDate.toDateString()) {
        dateText += ` - ${endDate.toLocaleDateString()}`;
      }

      pdf.text(dateText, margin, yPosition);
      yPosition += lineHeight;

      const timeText = endDate
        ? `Time: ${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${
          endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }`
        : `Time: ${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      pdf.text(timeText, margin, yPosition);
      yPosition += lineHeight;
    }
  }

  if (participants && participants.length > 0) {
    pdf.setFontSize(10);
    pdf.setFont(PDF_STYLES.font, "normal");
    pdf.setTextColor(...PDF_STYLES.colors.metadata);

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

  pdf.setFontSize(10);
  pdf.setFont(PDF_STYLES.font, "normal");
  pdf.setTextColor(...PDF_STYLES.colors.metadata);
  pdf.text("Summarized by ", margin, yPosition);

  const madeByWidth = pdf.getTextWidth("Summarized by ");
  pdf.setTextColor(...PDF_STYLES.colors.hyprnoteLink);

  const hyprnoteText = "Hyprnote";
  pdf.textWithLink(hyprnoteText, margin + madeByWidth, yPosition, { url: "https://www.hyprnote.com" });

  yPosition += lineHeight * 2;

  pdf.setDrawColor(...PDF_STYLES.colors.separatorLine);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += lineHeight;

  const segments = htmlToStructuredText(session?.enhanced_memo_html || "No content available");

  for (const segment of segments) {
    if (yPosition > pageHeight - margin) {
      addNewPage();
      yPosition = margin;
    }

    if (segment.isHeader) {
      const headerSizes = { 1: 14, 2: 13, 3: 12 };
      pdf.setFontSize(headerSizes[segment.isHeader as keyof typeof headerSizes]);
      pdf.setFont(PDF_STYLES.font, "bold");
      pdf.setTextColor(...PDF_STYLES.colors.headers);
      yPosition += lineHeight;
    } else {
      pdf.setFontSize(12);
      pdf.setFont(PDF_STYLES.font, "normal");
      pdf.setTextColor(...PDF_STYLES.colors.mainContent);
    }

    let xPosition = margin;
    let bulletSpace = 0;

    if (segment.isListItem && segment.listLevel !== undefined) {
      const baseIndent = 5;
      const levelIndent = 8;
      xPosition = margin + baseIndent + (segment.listLevel * levelIndent);

      bulletSpace = segment.listType === "ordered" ? 0 : 6;
    }

    const effectiveMaxWidth = maxWidth - (xPosition - margin) - bulletSpace;
    const lines = splitTextToLines(segment.text, pdf, effectiveMaxWidth);

    for (let i = 0; i < lines.length; i++) {
      if (yPosition > pageHeight - margin) {
        addNewPage();
        yPosition = margin;
      }

      if (
        segment.isListItem
        && segment.listType === "unordered"
        && segment.bulletType
        && i === 0
      ) {
        drawVectorBullet(
          pdf,
          segment.bulletType,
          xPosition + 2,
          yPosition - 1,
          1.0,
          PDF_STYLES.colors.bullets,
        );
      }

      const textXPosition = xPosition + bulletSpace;

      pdf.text(lines[i], textXPosition, yPosition);
      yPosition += lineHeight;
    }

    if (segment.isHeader || segment.text === "\n") {
      yPosition += lineHeight * 0.25;
    }
  }

  const pdfArrayBuffer = pdf.output("arraybuffer");
  const uint8Array = new Uint8Array(pdfArrayBuffer);

  const downloadsPath = await downloadDir();
  const filePath = downloadsPath.endsWith("/")
    ? `${downloadsPath}${filename}`
    : `${downloadsPath}/${filename}`;

  await writeFile(filePath, uint8Array);
  return filePath;
};
