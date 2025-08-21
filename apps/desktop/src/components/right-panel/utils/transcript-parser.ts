import { SpeakerIdentity, Word2 } from "@hypr/plugin-db";

interface ParseOptions {
  defaultDurationMs?: number;
  estimateDurationFromText?: boolean;
  wordsPerMinute?: number;
  strictMode?: boolean;
  allowEmptyLines?: boolean;
  minLinesToProcess?: number;
}

interface ParseResult {
  words: Word2[];
  errors: ParseError[];
  warnings: ParseWarning[];
  metadata: {
    totalLines: number;
    successfullyParsed: number;
    speakers: Set<string>;
    estimatedDuration: number;
    hasTimestamps: boolean;
  };
}

interface ParseError {
  line: number;
  message: string;
  originalText: string;
  severity: "error" | "warning";
}

interface ParseWarning {
  line: number;
  message: string;
  originalText: string;
  suggestion?: string;
}

class TranscriptParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public originalText: string,
    public severity: "error" | "warning" = "error",
  ) {
    super(`Line ${line}: ${message}`);
    this.name = "TranscriptParseError";
  }
}

export function parseTranscript(
  raw: string,
  options: ParseOptions = {},
): ParseResult {
  const {
    defaultDurationMs = 2000,
    estimateDurationFromText = true,
    wordsPerMinute = 150,
    strictMode = false,
    allowEmptyLines = true,
    minLinesToProcess = 1,
  } = options;

  // Early validation
  if (!raw || typeof raw !== "string") {
    throw new TranscriptParseError("Input must be a non-empty string", 0, "");
  }

  const trimmedRaw = raw.trim();
  if (trimmedRaw.length === 0) {
    return {
      words: [],
      errors: [{ line: 0, message: "Empty transcript provided", originalText: "", severity: "error" }],
      warnings: [],
      metadata: {
        totalLines: 0,
        successfullyParsed: 0,
        speakers: new Set(),
        estimatedDuration: 0,
        hasTimestamps: false,
      },
    };
  }

  // Utility functions
  function timeToMs(time: string): number {
    // Support multiple time formats
    const formats = [
      /^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/, // HH:MM:SS.mmm
      /^(\d{1,2}):(\d{2}):(\d{2})$/, // HH:MM:SS
      /^(\d{1,2}):(\d{2})$/, // MM:SS (treat as 00:MM:SS)
    ];

    for (let i = 0; i < formats.length; i++) {
      const match = time.match(formats[i]);
      if (match) {
        let [, h, m, s, ms = "0"] = match;

        // Handle MM:SS format
        if (i === 2) {
          s = m;
          m = h;
          h = "0";
        }

        const hours = parseInt(h, 10);
        const minutes = parseInt(m, 10);
        const seconds = parseInt(s, 10);
        const milliseconds = parseInt(ms.padEnd(3, "0"), 10);

        // Validate ranges
        if (minutes >= 60 || seconds >= 60) {
          throw new Error(`Invalid time values: ${time}`);
        }

        return ((hours * 60 * 60) + (minutes * 60) + seconds) * 1000 + milliseconds;
      }
    }

    throw new Error(`Invalid time format: ${time}`);
  }

  function estimateTextDuration(text: string, wpm: number): number {
    if (!text.trim()) {
      return 500; // 0.5 seconds for empty text
    }

    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const baseEstimate = (wordCount / wpm) * 60 * 1000;

    // Add reading pauses and natural speech patterns
    const pauseTime = Math.min(wordCount * 200, 2000); // Max 2 seconds of pauses
    return Math.max(1000, baseEstimate + pauseTime); // Minimum 1 second
  }

  function createSpeakerId(speakerName: string): string {
    return speakerName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);
  }

  function normalizeSpeakerName(name: string): string {
    return name
      .trim()
      .replace(/^(speaker\s*)/i, "") // Remove "Speaker" prefix
      .replace(/[^\w\s]/g, "") // Remove special characters except spaces
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  function validateChronology(words: Word2[]): ParseWarning[] {
    const warnings: ParseWarning[] = [];

    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1];
      const curr = words[i];

      if (prev.start_ms !== null && curr.start_ms !== null) {
        if (curr.start_ms < prev.start_ms) {
          warnings.push({
            line: i + 1,
            message: `Timestamp goes backwards: ${curr.start_ms}ms < ${prev.start_ms}ms`,
            originalText: curr.text,
            suggestion: "Check timestamp ordering",
          });
        }

        // Check for unrealistic time jumps (more than 10 minutes)
        const timeDiff = curr.start_ms - prev.start_ms;
        if (timeDiff > 10 * 60 * 1000) {
          warnings.push({
            line: i + 1,
            message: `Large time gap detected: ${Math.round(timeDiff / 1000)}s`,
            originalText: curr.text,
            suggestion: "Verify timestamp accuracy",
          });
        }
      }
    }

    return warnings;
  }

  function detectOverlaps(words: Word2[]): ParseWarning[] {
    const warnings: ParseWarning[] = [];

    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1];
      const curr = words[i];

      if (prev.end_ms !== null && curr.start_ms !== null && prev.end_ms > curr.start_ms) {
        const overlapMs = prev.end_ms - curr.start_ms;
        warnings.push({
          line: i + 1,
          message: `Speech overlap: ${overlapMs}ms overlap detected`,
          originalText: curr.text,
          suggestion: "Adjust duration estimates or check timestamps",
        });
      }
    }

    return warnings;
  }

  // Main parsing logic
  const lines = raw.split(/\r?\n/); // Handle both Unix and Windows line endings
  const words: Word2[] = [];
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const speakers = new Set<string>();
  let successfullyParsed = 0;
  let hasTimestamps = false;
  let totalEstimatedDuration = 0;

  // Enhanced regex patterns for maximum compatibility
  const patterns = [
    // Original format: HH:MM:SS — Speaker: Text
    /^(\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)\s*—\s*(.+?):\s*(.*)$/,
    // Alternative separators
    /^(\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)\s*[-–—]\s*(.+?):\s*(.*)$/,
    /^(\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)\s+(.+?):\s*(.*)$/,
    // Bracketed timestamps
    /^\[(\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)\]\s*(.+?):\s*(.*)$/,
    // Parenthesized timestamps
    /^\((\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)\)\s*(.+?):\s*(.*)$/,
    // Common formats without colons
    /^(\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)\s*(.+?)\s*:\s*(.*)$/,
    // MM:SS format (shorter timestamps)
    /^(\d{1,2}:\d{2})\s*—\s*(.+?):\s*(.*)$/,
    /^(\d{1,2}:\d{2})\s*[-–—]\s*(.+?):\s*(.*)$/,
  ];

  // Process each line
  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const trimmedLine = line.trim();

    // Skip empty lines if allowed
    if (!trimmedLine) {
      if (allowEmptyLines) {
        return;
      } else {
        warnings.push({
          line: lineNumber,
          message: "Empty line encountered",
          originalText: line,
          suggestion: strictMode ? "Remove empty lines in strict mode" : undefined,
        });

        if (strictMode) {
          errors.push({
            line: lineNumber,
            message: "Empty line not allowed in strict mode",
            originalText: line,
            severity: "error",
          });
        }
        return;
      }
    }

    let matched = false;

    // Try each pattern
    for (const pattern of patterns) {
      const match = trimmedLine.match(pattern);

      if (match) {
        matched = true;
        hasTimestamps = true;

        try {
          const [, timeStr, speakerName, text] = match;

          // Validate and clean inputs
          const cleanTime = timeStr.trim();
          const cleanSpeakerName = normalizeSpeakerName(speakerName);
          const cleanText = text.trim();

          if (!cleanTime) {
            throw new Error("Empty timestamp");
          }
          if (!cleanSpeakerName) {
            throw new Error("Empty or invalid speaker name");
          }
          if (!cleanText && strictMode) {
            throw new Error("Empty text in strict mode");
          }

          const startMs = timeToMs(cleanTime);
          const speakerId = createSpeakerId(cleanSpeakerName);

          speakers.add(cleanSpeakerName);

          // Calculate duration with improved estimation
          let endMs: number;
          if (estimateDurationFromText && cleanText) {
            const estimatedDuration = estimateTextDuration(cleanText, wordsPerMinute);
            endMs = startMs + estimatedDuration;
            totalEstimatedDuration += estimatedDuration;
          } else {
            endMs = startMs + defaultDurationMs;
            totalEstimatedDuration += defaultDurationMs;
          }

          const speaker: SpeakerIdentity = {
            type: "assigned",
            value: {
              id: speakerId,
              label: cleanSpeakerName,
            },
          };

          words.push({
            text: cleanText,
            speaker,
            confidence: null,
            start_ms: startMs,
            end_ms: endMs,
          });

          successfullyParsed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown parsing error";
          errors.push({
            line: lineNumber,
            message: errorMessage,
            originalText: line,
            severity: "error",
          });

          if (strictMode) {
            throw new TranscriptParseError(errorMessage, lineNumber, line);
          }
        }
        break;
      }
    }

    // Handle unmatched lines
    if (!matched) {
      // Try to detect if it's a speaker-only line (e.g., "Speaker A:")
      const speakerOnlyMatch = trimmedLine.match(/^(.+?):\s*$/);
      if (speakerOnlyMatch) {
        warnings.push({
          line: lineNumber,
          message: "Speaker line without timestamp or text",
          originalText: line,
          suggestion: "Add timestamp and text, or merge with next line",
        });
      } else {
        // Check if it looks like it might be a continuation of previous text
        const isLikelyContinuation = /^[a-z]/.test(trimmedLine) && words.length > 0;

        if (isLikelyContinuation) {
          warnings.push({
            line: lineNumber,
            message: "Possible text continuation without speaker/timestamp",
            originalText: line,
            suggestion: "Consider merging with previous line",
          });
        }
      }

      if (strictMode) {
        const error = {
          line: lineNumber,
          message: "Line does not match expected transcript format",
          originalText: line,
          severity: "error" as const,
        };
        errors.push(error);
        throw new TranscriptParseError(error.message, lineNumber, line);
      } else {
        // Create unassigned fallback entry
        words.push({
          text: trimmedLine,
          speaker: { type: "unassigned", value: { index: idx } },
          confidence: null,
          start_ms: null,
          end_ms: null,
        });

        warnings.push({
          line: lineNumber,
          message: "Line does not match expected format, created as unassigned",
          originalText: line,
          suggestion: "Format as: \"HH:MM:SS — Speaker: Text\"",
        });
      }
    }
  });

  // Validate minimum processing requirements
  if (successfullyParsed < minLinesToProcess && strictMode) {
    throw new TranscriptParseError(
      `Insufficient valid lines: ${successfullyParsed} < ${minLinesToProcess}`,
      0,
      raw.substring(0, 100),
    );
  }

  // Post-processing validations (only for successfully parsed lines)
  const timestampedWords = words.filter(w => w.start_ms !== null);
  if (timestampedWords.length > 1) {
    warnings.push(...validateChronology(timestampedWords));
    warnings.push(...detectOverlaps(timestampedWords));
  }

  // Additional quality checks
  if (speakers.size === 0 && words.length > 0) {
    warnings.push({
      line: 0,
      message: "No speakers detected in transcript",
      originalText: "",
      suggestion: "Verify speaker labeling format",
    });
  }

  if (hasTimestamps && successfullyParsed / lines.filter(l => l.trim()).length < 0.8) {
    warnings.push({
      line: 0,
      message: `Low parsing success rate: ${Math.round((successfullyParsed / lines.length) * 100)}%`,
      originalText: "",
      suggestion: "Check transcript format consistency",
    });
  }

  return {
    words,
    errors,
    warnings,
    metadata: {
      totalLines: lines.length,
      successfullyParsed,
      speakers,
      estimatedDuration: totalEstimatedDuration,
      hasTimestamps,
    },
  };
}

/**
 * Simplified parser function for backward compatibility
 * Matches the original component's usage pattern
 */
export function parseTranscriptSimple(raw: string): Word2[] {
  try {
    const result = parseTranscript(raw, {
      strictMode: false,
      estimateDurationFromText: true,
      allowEmptyLines: true,
      wordsPerMinute: 150,
    });

    // Log warnings and errors for debugging
    if (result.errors.length > 0) {
      console.warn("Transcript parsing errors:", result.errors);
    }

    if (result.warnings.length > 0) {
      console.info("Transcript parsing warnings:", result.warnings);
    }

    // Log success metrics
    console.info(
      `Transcript parsed: ${result.metadata.successfullyParsed}/${result.metadata.totalLines} lines, ${result.metadata.speakers.size} speakers`,
    );

    return result.words;
  } catch (error) {
    console.error("Failed to parse transcript:", error);

    // Fallback: return empty array or throw based on error type
    if (error instanceof TranscriptParseError) {
      throw error;
    }

    return [];
  }
}

/**
 * Async version for large transcripts (recommended for production)
 * Processes transcript in chunks to avoid blocking the UI
 */
export async function parseTranscriptAsync(
  raw: string,
  options: ParseOptions = {},
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    // Use setTimeout to make parsing non-blocking
    setTimeout(() => {
      try {
        const result = parseTranscript(raw, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, 0);
  });
}

/**
 * Validation helper to check transcript format before parsing
 */
export function validateTranscriptFormat(raw: string): {
  isValid: boolean;
  confidence: number;
  suggestedFormat: string;
  issues: string[];
} {
  const lines = raw.trim().split(/\r?\n/).filter(l => l.trim());
  const issues: string[] = [];
  let matchingLines = 0;

  if (lines.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      suggestedFormat: "HH:MM:SS — Speaker: Text",
      issues: ["Empty transcript"],
    };
  }

  // Quick format detection
  const timestampPattern = /\d{1,2}:\d{2}(:\d{2})?/;
  const speakerPattern = /:\s*\w/;

  lines.forEach(line => {
    const hasTimestamp = timestampPattern.test(line);
    const hasSpeaker = speakerPattern.test(line);

    if (hasTimestamp && hasSpeaker) {
      matchingLines++;
    }
  });

  const confidence = matchingLines / lines.length;

  if (confidence < 0.5) {
    issues.push("Low format consistency detected");
  }

  if (confidence < 0.2) {
    issues.push("Most lines do not match expected format");
  }

  return {
    isValid: confidence > 0.5,
    confidence: Math.round(confidence * 100),
    suggestedFormat: "HH:MM:SS — Speaker: Text",
    issues,
  };
}
