import { downloadDir } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import { jsPDF } from "jspdf";

import { commands as dbCommands, type Event, type Human, type Session } from "@hypr/plugin-db";

export type SessionData = Session & {
  participants?: Human[];
  event?: Event | null;
};

// Enhanced interface to support vector bullets
interface TextSegment {
  text: string;
  isHeader?: number; // 1, 2, 3 for h1, h2, h3
  isListItem?: boolean;
  listType?: 'ordered' | 'unordered';
  listLevel?: number;
  listItemNumber?: number;
  bulletType?: 'filled-circle' | 'hollow-circle' | 'square' | 'triangle'; // New: for vector bullets
}

// New: List context to track state during parsing
interface ListContext {
  type: 'ordered' | 'unordered';
  level: number;
  counters: number[]; // Track numbering for each level
}

// TODO:
// 1. Tiptap already has structured output - toJSON(). Should be cleaner than htmlToStructuredText.
// 2. Fetch should happen outside. This file should be only do the rendering. (Ideally writeFile should be happened outside too)
// 3. exportToPDF should be composed with multiple steps.

const htmlToStructuredText = (html: string): TextSegment[] => {
  if (!html) {
    return [];
  }

  // Strip out bold and italic tags while preserving content
  const cleanedHtml = html
    .replace(/<\/?strong>/gi, '')   // Remove <strong> and </strong>
    .replace(/<\/?b>/gi, '')        // Remove <b> and </b>
    .replace(/<\/?em>/gi, '')       // Remove <em> and </em>
    .replace(/<\/?i>/gi, '');       // Remove <i> and </i>

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = cleanedHtml;  // Use cleaned HTML instead of original

  const segments: TextSegment[] = [];
  const listStack: ListContext[] = []; // Track nested lists

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
        
        // Enhanced list handling
        case "ul":
          processListContainer(element, 'unordered');
          break;
        case "ol":
          processListContainer(element, 'ordered');
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

  const processListContainer = (listElement: Element, type: 'ordered' | 'unordered') => {
    const level = listStack.length;
    
    // Initialize counters array if needed
    const counters = [...(listStack[listStack.length - 1]?.counters || [])];
    if (counters.length <= level) {
      counters[level] = 0;
    }

    // Push new list context
    listStack.push({ type, level, counters });

    // Process list items
    Array.from(listElement.children).forEach((child, index) => {
      if (child.tagName.toLowerCase() === 'li') {
        if (type === 'ordered') {
          counters[level] = index + 1;
        }
        processNode(child);
      }
    });

    // Pop list context
    listStack.pop();
  };

  const processListItem = (liElement: Element) => {
    const currentList = listStack[listStack.length - 1];
    if (!currentList) return;

    const { type, level, counters } = currentList;
    
    // Extract text content, handling nested formatting
    const textContent = getListItemText(liElement);
    
    // For unordered lists, determine bullet type based on level
    // After level 2 (third level), always use square
    const bulletTypes = ['filled-circle', 'hollow-circle', 'square'] as const;
    
    segments.push({
      text: type === 'ordered' 
        ? `${counters[level]}. ${textContent}`  // Keep numbers as text
        : textContent,  // Remove bullet prefix for unordered - we'll draw it as vector
      isListItem: true,
      listType: type,
      listLevel: level,
      listItemNumber: type === 'ordered' ? counters[level] : undefined,
      bulletType: type === 'unordered' 
        ? (level <= 2 ? bulletTypes[level] : 'square')  // Cap at square for level 3+
        : undefined
    });

    // Process nested lists within this list item
    Array.from(liElement.children).forEach(child => {
      if (child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol') {
        processNode(child);
      }
    });
  };

  const getListItemText = (liElement: Element): string => {
    // Get only direct text content, excluding nested lists
    let text = '';
    for (const child of liElement.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent || '';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        if (!['ul', 'ol'].includes(element.tagName.toLowerCase())) {
          text += element.textContent || '';
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
          // Remove bold/italic detection - treat everything as normal text
          segments.push({ text });
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

// Update the drawVectorBullet function signature to use a smaller default size
const drawVectorBullet = (
  pdf: jsPDF, 
  bulletType: 'filled-circle' | 'hollow-circle' | 'square' | 'triangle',
  x: number, 
  y: number, 
  size: number = 1.0  // Reduced from 1.5 to 1.0
) => {
  // Save current state
  const currentFillColor = pdf.getFillColor();
  const currentDrawColor = pdf.getDrawColor();
  
  // Set bullet color (dark gray to match text)
  pdf.setFillColor(50, 50, 50);
  pdf.setDrawColor(50, 50, 50);
  pdf.setLineWidth(0.2);  // Also made line width thinner

  // Adjust y position to center bullet with text baseline
  const bulletY = y - (size / 2);

  switch (bulletType) {
    case 'filled-circle':
      pdf.circle(x, bulletY, size * 0.85, 'F'); // Made circle smaller (0.85x instead of 1x)
      break;
      
    case 'hollow-circle':
      pdf.circle(x, bulletY, size * 0.85, 'S'); // Made circle smaller (0.85x instead of 1x)
      break;
      
    case 'square':
      const squareSize = size * 1.4; // Made square bigger (1.4x instead of 1.1x)
      pdf.rect(
        x - squareSize/2, 
        bulletY - squareSize/2, 
        squareSize, 
        squareSize, 
        'F'
      );
      break;
      
    case 'triangle':
      const triangleSize = size * 1.15; // Keep triangle the same
      // Create triangle path
      pdf.triangle(
        x, bulletY - triangleSize/2,           // top point
        x - triangleSize/2, bulletY + triangleSize/2,  // bottom left
        x + triangleSize/2, bulletY + triangleSize/2,  // bottom right
        'F'
      );
      break;
  }

  // Restore previous state
  pdf.setFillColor(currentFillColor);
  pdf.setDrawColor(currentDrawColor);
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
      // Remove font style logic - always use normal
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(50, 50, 50); // Dark gray for content
    }

    // Enhanced list item handling with vector bullets
    let xPosition = margin;
    let bulletSpace = 0;
    
    if (segment.isListItem && segment.listLevel !== undefined) {
      // Base indentation + additional for each level
      const baseIndent = 5;
      const levelIndent = 8;
      xPosition = margin + baseIndent + (segment.listLevel * levelIndent);
      
      // Reserve space for bullet/number
      bulletSpace = segment.listType === 'ordered' ? 0 : 6; // Space for vector bullet
    }

    // Adjust max width for indented content and bullet space
    const effectiveMaxWidth = maxWidth - (xPosition - margin) - bulletSpace;
    const lines = splitTextToLines(segment.text, pdf, effectiveMaxWidth);

    for (let i = 0; i < lines.length; i++) {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      // Draw vector bullet for first line of unordered list items
      if (segment.isListItem && 
          segment.listType === 'unordered' && 
          segment.bulletType && 
          i === 0) {
        drawVectorBullet(
          pdf, 
          segment.bulletType, 
          xPosition + 2, // Position bullet slightly right of indent
          yPosition - 1, // Adjust for text baseline
          1.0 // Reduced bullet size from 1.5 to 1.0
        );
      }

      // Position text after bullet space
      const textXPosition = segment.isListItem && i > 0 
        ? xPosition + bulletSpace + 4  // Continuation lines with extra indent
        : xPosition + bulletSpace;

      pdf.text(lines[i], textXPosition, yPosition);
      yPosition += lineHeight;
    }

    // Add extra space after headers and paragraphs
    if (segment.isHeader || segment.text === "\n") {
      yPosition += lineHeight * 0.5;
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
