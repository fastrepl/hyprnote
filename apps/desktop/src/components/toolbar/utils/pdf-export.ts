import { downloadDir } from "@tauri-apps/api/path";
import { writeFile } from "@tauri-apps/plugin-fs";
import { jsPDF } from "jspdf";

export interface SessionData {
  title?: string;
  created_at?: string;
  enhanced_memo_html?: string;
  [key: string]: any;
}

interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  isHeader?: number; // 1, 2, 3 for h1, h2, h3
  isListItem?: boolean;
}

// Enhanced HTML to structured text converter with markdown preservation
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

export const exportToPDF = async (session: SessionData): Promise<string> => {
  try {
    // Generate filename
    const filename = session?.title
      ? `${session.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`
      : `note_${new Date().toISOString().split("T")[0]}.pdf`;

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // PDF dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    const lineHeight = 6;

    let yPosition = margin;

    // Add title
    const title = session?.title || "Untitled Note";
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0); // Black
    pdf.text(title, margin, yPosition);
    yPosition += lineHeight * 2;

    // Add creation date
    if (session?.created_at) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100); // Gray
      const createdAt = `Created: ${new Date(session.created_at).toLocaleDateString()}`;
      pdf.text(createdAt, margin, yPosition);
      yPosition += lineHeight;
    }

    // Add attribution with colored "Hyprnote"
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100); // Gray
    pdf.text("Made by ", margin, yPosition);

    // Calculate width of "Made by " to position "Hyprnote"
    const madeByWidth = pdf.getTextWidth("Made by ");
    pdf.setTextColor(37, 99, 235); // Blue color for Hyprnote
    pdf.text("Hyprnote", margin + madeByWidth, yPosition);

    // Calculate width for the rest of the text
    const hyprnoteWidth = pdf.getTextWidth("Hyprnote");
    pdf.setTextColor(100, 100, 100); // Back to gray
    pdf.text(" (www.hyprnote.com)", margin + madeByWidth + hyprnoteWidth, yPosition);

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

    // Get PDF as array buffer
    const pdfArrayBuffer = pdf.output("arraybuffer");
    const uint8Array = new Uint8Array(pdfArrayBuffer);

    // Get downloads directory and create full path
    const downloadsPath = await downloadDir();
    const filePath = downloadsPath.endsWith("/")
      ? `${downloadsPath}${filename}`
      : `${downloadsPath}/${filename}`;

    // Write file to Downloads folder
    await writeFile(filePath, uint8Array);

    console.log("PDF exported successfully to:", filePath);
    return filename;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }
};
