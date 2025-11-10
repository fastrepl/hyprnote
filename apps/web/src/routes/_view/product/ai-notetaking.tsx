import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { MockWindow } from "@/components/mock-window";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/ai-notetaking")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Notetaking - Hyprnote" },
      {
        name: "description",
        content:
          "Complete AI-powered notetaking solution. Record meetings, transcribe audio, and get intelligent summaries with customizable templates. Works with any video conferencing tool.",
      },
      { property: "og:title", content: "AI Notetaking - Hyprnote" },
      {
        property: "og:description",
        content:
          "Record meetings in real-time or upload audio files. Get instant AI transcriptions, summaries, and action items with customizable templates.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/product/ai-notetaking" },
    ],
  }),
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <EditorSection />
        <SlashSeparator />
        <TranscriptionSection />
        <SlashSeparator />
        <SummariesSection />
        <SlashSeparator />
        <SearchSection />
        <SlashSeparator />
        <SharingSection />
        <SlashSeparator />
        <FloatingPanelSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mb-12 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            AI notetaking that captures everything
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600">
            Record meetings or upload audio files to get instant AI transcriptions and customizable summaries
          </p>
          <div className="mt-8">
            <a
              href="https://hyprnote.com/download"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Download for free
            </a>
          </div>
        </header>
      </div>
      <div className="relative aspect-video w-full border-t border-neutral-100 overflow-hidden">
        <img
          src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/ai-notetaking-hero.jpg"
          alt="AI notetaking in action"
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

function EditorSection() {
  return (
    <section id="editor" className="bg-stone-50/30">
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-600">Notion-like editor with markdown support</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Write and organize your notes with a powerful, intuitive editor that supports full markdown syntax.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
                <span className="text-neutral-600">Full markdown syntax support for quick formatting</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
                <span className="text-neutral-600">Clean, distraction-free writing experience</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
                <span className="text-neutral-600">Rich text editing with familiar keyboard shortcuts</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-end justify-center px-8 pb-0 pt-8 bg-stone-50/30 overflow-hidden">
          <MockWindow>
            <div className="p-6 h-[320px] overflow-hidden">
              <AnimatedMarkdownDemo />
            </div>
          </MockWindow>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-600 mb-3">Notion-like editor with markdown support</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Write and organize your notes with a powerful, intuitive editor that supports full markdown syntax.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
              <span className="text-neutral-600 text-sm">Full markdown syntax support for quick formatting</span>
            </li>
            <li className="flex items-start gap-3">
              <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
              <span className="text-neutral-600 text-sm">Clean, distraction-free writing experience</span>
            </li>
            <li className="flex items-start gap-3">
              <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
              <span className="text-neutral-600 text-sm">Rich text editing with familiar keyboard shortcuts</span>
            </li>
          </ul>
        </div>
        <div className="px-6 pb-0 bg-stone-50/30 overflow-clip">
          <div className="border border-neutral-100 rounded-t-lg shadow-lg bg-white overflow-hidden">
            <div className="bg-neutral-100 border-b border-neutral-100 px-3 py-2 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
              </div>
            </div>
            <div className="p-6 h-[380px] overflow-hidden">
              <AnimatedMarkdownDemo isMobile />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AudioTranscriptionDemo() {
  const [progress, setProgress] = useState(0);

  // Words with their position along the timeline (0 to 1)
  // Positioning accounts for approximate text width to prevent overlap
  const words = [
    { position: 0.02, text: "Welcome" }, // ~7 chars
    { position: 0.15, text: "to" }, // ~2 chars
    { position: 0.20, text: "today's" }, // ~7 chars
    { position: 0.33, text: "meeting" }, // ~7 chars
    { position: 0.48, text: "Let's" }, // ~5 chars
    { position: 0.59, text: "discuss" }, // ~7 chars
    { position: 0.73, text: "the" }, // ~3 chars
    { position: 0.79, text: "Q4" }, // ~2 chars
    { position: 0.86, text: "roadmap" }, // ~7 chars
  ];

  // Generate static audio bars with varying heights (memoized to prevent regeneration)
  const audioBarHeights = useState(() => {
    const audioBarCount = 60;
    return Array.from({ length: audioBarCount }, () => {
      // Random heights between 20% and 100%
      return Math.random() * 0.8 + 0.2;
    });
  })[0];

  useEffect(() => {
    const duration = 8000; // 8 seconds for full cycle
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed % duration) / duration;

      setProgress(newProgress);

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div
      className="relative w-full bg-white flex flex-col items-center justify-center p-8 gap-6"
      style={{ aspectRatio: "52/39" }}
    >
      {/* Audio bars - taking up more vertical space */}
      <div className="w-full flex items-center justify-center gap-1 flex-1">
        {audioBarHeights.map((height, i) => {
          const isTranscribed = i / audioBarHeights.length <= progress;
          return (
            <div
              key={i}
              className="flex-1 transition-colors duration-300 rounded-full"
              style={{
                height: `${height * 100}%`,
                backgroundColor: isTranscribed ? "#ef4444" : "#f5f5f4",
                minWidth: "6px",
              }}
            />
          );
        })}
      </div>

      {/* Subtitle display - words appear along timeline */}
      <div className="w-full px-4 relative h-8 flex items-center">
        {words.map((word, i) => {
          const isVisible = progress >= word.position;
          return (
            <span
              key={i}
              className="absolute text-neutral-600 text-xs sm:text-sm transition-opacity duration-300"
              style={{
                left: `${word.position * 100}%`,
                opacity: isVisible ? 1 : 0,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedMarkdownDemo({ isMobile = false }: { isMobile?: boolean }) {
  const [completedLines, setCompletedLines] = useState<React.ReactElement[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [isTransformed, setIsTransformed] = useState(false);

  const lines = [
    { text: "# Meeting Notes", type: "heading" as const },
    { text: "- Product roadmap review", type: "bullet" as const },
    { text: "- Q4 marketing strategy", type: "bullet" as const },
    { text: "- Budget allocation", type: "bullet" as const },
    { text: "**Decision:** Launch campaign by end of month", type: "bold" as const },
  ];

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      // Reset animation after a pause
      const timeout = setTimeout(() => {
        setCompletedLines([]);
        setCurrentLineIndex(0);
        setTypingText("");
        setIsTransformed(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    const currentLine = lines[currentLineIndex];
    let charIndex = 0;
    let timeout: NodeJS.Timeout;

    const typeCharacter = () => {
      if (charIndex < currentLine.text.length) {
        const newText = currentLine.text.slice(0, charIndex + 1);
        setTypingText(newText);
        charIndex++;

        // Check if we just typed the trigger characters
        const shouldTransform = (currentLine.type === "heading" && newText === "# ")
          || (currentLine.type === "bullet" && newText === "- ")
          || (currentLine.type === "bold" && newText.match(/\*\*[^*]+\*\*/));

        if (shouldTransform) {
          setIsTransformed(true);
        }

        timeout = setTimeout(typeCharacter, 60);
      } else {
        // Finished typing this line
        timeout = setTimeout(() => {
          // Add the completed line
          const completedElement = renderCompletedLine(currentLine, isMobile);
          if (completedElement) {
            setCompletedLines((prev) => [...prev, completedElement]);
          }

          // Reset for next line
          setTypingText("");
          setIsTransformed(false);
          setCurrentLineIndex((prev) => prev + 1);
        }, 800);
      }
    };

    typeCharacter();

    return () => clearTimeout(timeout);
  }, [currentLineIndex, isMobile]);

  const renderCompletedLine = (line: typeof lines[number], mobile: boolean) => {
    const key = `completed-${currentLineIndex}`;

    if (line.type === "heading") {
      const text = line.text.replace("# ", "");
      return (
        <h1 key={key} className={cn("font-bold text-stone-700", mobile ? "text-xl" : "text-2xl")}>
          {text}
        </h1>
      );
    }

    if (line.type === "bullet") {
      const text = line.text.replace("- ", "");
      return (
        <ul key={key} className={cn("list-disc pl-5 text-neutral-700", mobile ? "text-sm" : "text-base")}>
          <li>{text}</li>
        </ul>
      );
    }

    if (line.type === "bold") {
      const parts = line.text.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={key} className={cn("text-neutral-700", mobile ? "text-sm" : "text-base")}>
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <span key={i} className="font-bold">{part.slice(2, -2)}</span>;
            }
            return part;
          })}
        </p>
      );
    }

    return null;
  };

  const renderCurrentLine = () => {
    const currentLine = lines[currentLineIndex];

    if (!currentLine) {
      return null;
    }

    if (currentLine.type === "heading" && isTransformed) {
      const displayText = typingText.slice(2); // Remove "# "
      return (
        <h1 className={cn("font-bold text-stone-700", isMobile ? "text-xl" : "text-2xl")}>
          {displayText}
          <span className="animate-pulse">|</span>
        </h1>
      );
    }

    if (currentLine.type === "bullet" && isTransformed) {
      const displayText = typingText.slice(2); // Remove "- "
      return (
        <ul className={cn("list-disc pl-5 text-neutral-700", isMobile ? "text-sm" : "text-base")}>
          <li>
            {displayText}
            <span className="animate-pulse">|</span>
          </li>
        </ul>
      );
    }

    if (currentLine.type === "bold" && isTransformed) {
      const parts = typingText.split(/(\*\*.*?\*\*)/g);
      return (
        <p className={cn("text-neutral-700", isMobile ? "text-sm" : "text-base")}>
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <span key={i} className="font-bold">{part.slice(2, -2)}</span>;
            }
            return part;
          })}
          <span className="animate-pulse">|</span>
        </p>
      );
    }

    // Show raw text before transformation
    return (
      <div className={cn("text-neutral-700", isMobile ? "text-sm" : "text-base")}>
        {typingText}
        <span className="animate-pulse">|</span>
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", isMobile && "space-y-2")}>
      {completedLines}
      {currentLineIndex < lines.length && renderCurrentLine()}
    </div>
  );
}

function TranscriptionSection() {
  return (
    <section id="transcription" className="border-y border-neutral-100">
      <div className="text-center py-12 px-4 lg:px-0">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">Transcription</h2>
        <p className="text-neutral-600 max-w-2xl mx-auto">
          From live meetings to recorded audio, Hyprnote can transcribe it all.
        </p>
      </div>

      <div className="border-t border-neutral-100">
        <div className="hidden sm:grid sm:grid-cols-2">
          <div className="border-r border-neutral-100 flex flex-col">
            <div className="p-8 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon icon="mdi:chip" className="text-3xl text-stone-600" />
                  <h3 className="text-2xl font-serif text-stone-600">Fully on-device</h3>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white opacity-50 text-xs font-medium whitespace-nowrap">
                  Apple Silicon only
                </div>
              </div>
              <p className="text-base text-neutral-600 leading-relaxed">
                For Apple Silicon Macs, transcription happens entirely on your device. Fast, private, and no internet
                required.
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden">
              <img
                src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/no-wifi.png"
                alt="On-device transcription"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="p-8 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Icon icon="mdi:upload" className="text-3xl text-stone-600" />
                <h3 className="text-2xl font-serif text-stone-600">Upload files</h3>
              </div>
              <p className="text-base text-neutral-600 leading-relaxed">
                Upload audio files (M4A, MP3, WAV) or existing transcripts (VTT, TXT) to get AI summaries and insights.
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-neutral-100">
              <AudioTranscriptionDemo />
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="border-b border-neutral-100">
            <div className="p-6">
              <div className="inline-block px-4 py-1.5 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white opacity-50 text-xs font-medium mb-3">
                Apple Silicon only
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Icon icon="mdi:chip" className="text-2xl text-stone-600" />
                <h3 className="text-xl font-serif text-stone-600">Fully on-device</h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                For Apple Silicon Macs, transcription happens entirely on your device. Fast, private, and no internet
                required.
              </p>
            </div>
            <div className="overflow-hidden bg-neutral-100">
              <img
                src="https://via.placeholder.com/600x400/e5e5e5/a3a3a3?text=On-Device+Transcription"
                alt="On-device transcription"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
          <div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Icon icon="mdi:upload" className="text-2xl text-stone-600" />
                <h3 className="text-xl font-serif text-stone-600">Upload files</h3>
              </div>
              <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                Upload audio files (M4A, MP3, WAV) or existing transcripts (VTT, TXT) to get AI summaries and insights.
              </p>
            </div>
            <div className="overflow-hidden bg-neutral-100">
              <AudioTranscriptionDemo />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummariesSection() {
  const [typedText1, setTypedText1] = useState("");
  const [typedText2, setTypedText2] = useState("");
  const [enhancedLines, setEnhancedLines] = useState(0);

  const text1 = "metrisc w/ john";
  const text2 = "stakehlder mtg";

  useEffect(() => {
    const runAnimation = () => {
      setTypedText1("");
      setTypedText2("");
      setEnhancedLines(0);

      let currentIndex1 = 0;
      setTimeout(() => {
        const interval1 = setInterval(() => {
          if (currentIndex1 < text1.length) {
            setTypedText1(text1.slice(0, currentIndex1 + 1));
            currentIndex1++;
          } else {
            clearInterval(interval1);

            let currentIndex2 = 0;
            const interval2 = setInterval(() => {
              if (currentIndex2 < text2.length) {
                setTypedText2(text2.slice(0, currentIndex2 + 1));
                currentIndex2++;
              } else {
                clearInterval(interval2);

                setTimeout(() => {
                  setEnhancedLines(1);
                  setTimeout(() => {
                    setEnhancedLines(2);
                    setTimeout(() => {
                      setEnhancedLines(3);
                      setTimeout(() => {
                        setEnhancedLines(4);
                        setTimeout(() => runAnimation(), 1000);
                      }, 800);
                    }, 800);
                  }, 800);
                }, 500);
              }
            }, 50);
          }
        }, 50);
      }, 500);
    };

    runAnimation();
  }, []);

  return (
    <section id="summaries">
      <div className="text-center py-12 px-4 lg:px-0">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">AI summaries</h2>
        <p className="text-neutral-600 max-w-3xl mx-auto">
          Get intelligent summaries after your meeting ends. Hyprnote combines your notes with transcripts to create
          perfect summaries.
        </p>
      </div>
      <div className="border-t border-neutral-100">
        <div className="hidden sm:grid sm:grid-cols-2">
          <div className="border-r border-neutral-100 flex flex-col overflow-clip">
            <div className="p-8 flex flex-col gap-4">
              <p className="text-lg font-serif text-neutral-600 leading-relaxed">
                <span className="font-semibold">While you take notes,</span>{" "}
                Hyprnote listens and keeps track of everything that happens during the meeting.
              </p>
            </div>
            <div className="flex-1 flex items-end justify-center px-8 pb-0 bg-stone-50/30">
              <MockWindow showAudioIndicator>
                <div className="p-6 h-[300px] overflow-hidden">
                  <div className="text-neutral-700">ui update - mobile</div>
                  <div className="text-neutral-700">api</div>
                  <div className="text-neutral-700 mt-4">new dash - urgent</div>
                  <div className="text-neutral-700">a/b test next wk</div>
                  <div className="text-neutral-700 mt-4">
                    {typedText1}
                    {typedText1 && typedText1.length < text1.length && <span className="animate-pulse">|</span>}
                  </div>
                  <div className="text-neutral-700">
                    {typedText2}
                    {typedText2 && typedText2.length < text2.length && <span className="animate-pulse">|</span>}
                  </div>
                </div>
              </MockWindow>
            </div>
          </div>

          <div className="flex flex-col overflow-clip">
            <div className="p-8 flex flex-col gap-4">
              <p className="text-lg font-serif text-neutral-600 leading-relaxed">
                <span className="font-semibold">After the meeting is over,</span>{" "}
                Hyprnote combines your notes with transcripts to create a perfect summary.
              </p>
            </div>
            <div className="flex-1 flex items-end justify-center px-8 pb-0 bg-stone-50/30">
              <MockWindow>
                <div className="p-6 space-y-4 h-[300px] overflow-hidden">
                  <div className="space-y-2">
                    <h4
                      className={cn(
                        "text-lg font-semibold text-stone-700 transition-opacity duration-500",
                        enhancedLines >= 1 ? "opacity-100" : "opacity-0",
                      )}
                    >
                      Mobile UI Update and API Adjustments
                    </h4>
                    <ul className="space-y-2 text-neutral-700 list-disc pl-5">
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 1 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        Sarah presented the new mobile UI update, which includes a streamlined navigation bar and
                        improved button placements for better accessibility.
                      </li>
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 2 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        Ben confirmed that API adjustments are needed to support dynamic UI changes, particularly for
                        fetching personalized user data more efficiently.
                      </li>
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 3 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        The UI update will be implemented in phases, starting with core navigation improvements. Ben
                        will ensure API modifications are completed before development begins.
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4
                      className={cn(
                        "font-semibold text-stone-700 transition-opacity duration-500",
                        enhancedLines >= 4 ? "opacity-100" : "opacity-0",
                      )}
                    >
                      New Dashboard – Urgent Priority
                    </h4>
                    <ul className="space-y-2 text-sm text-neutral-700 list-disc pl-5">
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 4 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        Alice emphasized that the new analytics dashboard must be prioritized due to increasing
                        stakeholder demand.
                      </li>
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 5 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        The new dashboard will feature real-time user engagement metrics and a customizable reporting
                        system.
                      </li>
                    </ul>
                  </div>
                </div>
              </MockWindow>
            </div>
          </div>
        </div>

        <div className="sm:hidden">
          <div className="border-b border-neutral-100">
            <div className="p-6 pb-2">
              <p className="text-base font-serif text-neutral-600 leading-relaxed mb-4">
                <span className="font-semibold">While you take notes,</span>{" "}
                Hyprnote listens and keeps track of everything that happens during the meeting.
              </p>
            </div>
            <div className="px-6 pb-0 bg-stone-50/30 overflow-clip">
              <div className="border border-neutral-100 rounded-t-lg shadow-lg bg-white overflow-hidden">
                <div className="bg-neutral-100 border-b border-neutral-100 px-3 py-2 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <div className="p-6 h-[200px] overflow-hidden">
                  <div className="text-neutral-700">ui update - mobile</div>
                  <div className="text-neutral-700">api</div>
                  <div className="text-neutral-700 mt-3">new dash - urgent</div>
                  <div className="text-neutral-700">a/b test next wk</div>
                  <div className="text-neutral-700 mt-3">
                    {typedText1}
                    {typedText1 && typedText1.length < text1.length && <span className="animate-pulse">|</span>}
                  </div>
                  <div className="text-neutral-700">
                    {typedText2}
                    {typedText2 && typedText2.length < text2.length && <span className="animate-pulse">|</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="p-6 pb-2">
              <p className="text-base font-serif text-neutral-600 leading-relaxed mb-4">
                <span className="font-semibold">After the meeting is over,</span>{" "}
                Hyprnote combines your notes with transcripts to create a perfect summary.
              </p>
            </div>
            <div className="px-6 pb-0 bg-stone-50/30 overflow-clip">
              <div className="border border-neutral-100 rounded-t-lg shadow-lg bg-white overflow-hidden">
                <div className="bg-neutral-100 border-b border-neutral-100 px-3 py-2 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <div className="p-6 space-y-4 h-[200px] overflow-hidden">
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-stone-700">Mobile UI Update and API Adjustments</h4>
                    <ul className="space-y-2 text-neutral-700 list-disc pl-4">
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 1 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        Sarah presented the new mobile UI update, which includes a streamlined navigation bar and
                        improved button placements for better accessibility.
                      </li>
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 2 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        Ben confirmed that API adjustments are needed to support dynamic UI changes, particularly for
                        fetching personalized user data more efficiently.
                      </li>
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 3 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        The UI update will be implemented in phases, starting with core navigation improvements. Ben
                        will ensure API modifications are completed before development begins.
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-stone-700">New Dashboard – Urgent Priority</h4>
                    <ul className="space-y-2 text-neutral-700 list-disc pl-4">
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 4 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        Alice emphasized that the new analytics dashboard must be prioritized due to increasing
                        stakeholder demand.
                      </li>
                      <li
                        className={cn(
                          "transition-opacity duration-500",
                          enhancedLines >= 5 ? "opacity-100" : "opacity-0",
                        )}
                      >
                        The new dashboard will feature real-time user engagement metrics and a customizable reporting
                        system.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchSection() {
  return (
    <section id="search" className="bg-stone-50/30">
      <div className="py-12 lg:py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif text-stone-600 mb-4">Search notes instantly by who, what, when</h2>
          <p className="text-lg text-neutral-600 mb-8 max-w-3xl mx-auto">
            Find any note, conversation, or meeting in seconds. Search by participant names, topics discussed, keywords,
            or date ranges to instantly locate the information you need.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-3xl mx-auto">
            <div className="p-6 border border-neutral-100 rounded-sm text-center">
              <Icon icon="mdi:account-search" className="text-4xl text-blue-600 mb-3 mx-auto" />
              <h3 className="text-lg font-serif text-stone-600 mb-2">Who</h3>
              <p className="text-sm text-neutral-600">
                Search by participant or speaker names
              </p>
            </div>
            <div className="p-6 border border-neutral-100 rounded-sm text-center">
              <Icon icon="mdi:text-search" className="text-4xl text-green-600 mb-3 mx-auto" />
              <h3 className="text-lg font-serif text-stone-600 mb-2">What</h3>
              <p className="text-sm text-neutral-600">
                Find by keywords, topics, or content
              </p>
            </div>
            <div className="p-6 border border-neutral-100 rounded-sm text-center">
              <Icon icon="mdi:calendar-search" className="text-4xl text-purple-600 mb-3 mx-auto" />
              <h3 className="text-lg font-serif text-stone-600 mb-2">When</h3>
              <p className="text-sm text-neutral-600">
                Filter by date, time, or range
              </p>
            </div>
          </div>
          <ul className="space-y-3 text-left max-w-2xl mx-auto">
            <li className="flex items-start gap-3">
              <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
              <span className="text-neutral-600">Lightning-fast full-text search across all notes</span>
            </li>
            <li className="flex items-start gap-3">
              <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
              <span className="text-neutral-600">Search within transcripts and summaries</span>
            </li>
            <li className="flex items-start gap-3">
              <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
              <span className="text-neutral-600">Filter by tags, dates, and participants</span>
            </li>
            <li className="flex items-start gap-3">
              <Icon icon="mdi:check-circle" className="text-green-600 shrink-0 mt-0.5 text-xl" />
              <span className="text-neutral-600">Jump directly to relevant moments in recordings</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white opacity-50 text-xs font-medium mb-3">
            Coming Soon
          </div>
          <h3 className="text-xl font-serif text-stone-600 mb-2">Advanced search view</h3>
          <p className="text-sm text-neutral-600 max-w-2xl mx-auto">
            Build complex queries with boolean operators, date ranges, and custom filters for powerful search
            capabilities.
          </p>
        </div>
      </div>
    </section>
  );
}

function SharingSection() {
  return (
    <section id="sharing" className="py-12 lg:py-20 px-6">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white opacity-50 text-xs font-medium mb-4">
          Coming Soon
        </div>
        <h2 className="text-3xl font-serif text-stone-600 mb-4">Share notes</h2>
        <p className="text-lg text-neutral-600 mb-12 max-w-3xl mx-auto">
          Collaborate seamlessly by sharing meeting notes, transcripts, and summaries.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 border border-neutral-100 rounded-sm">
            <Icon icon="mdi:link-variant" className="text-4xl text-blue-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">Public sharing</h3>
            <p className="text-neutral-600 leading-relaxed">
              Generate shareable links for easy distribution to anyone.
            </p>
          </div>
          <div className="p-8 border border-neutral-100 rounded-sm">
            <Icon icon="mdi:file-export" className="text-4xl text-green-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">Export formats</h3>
            <p className="text-neutral-600 leading-relaxed">
              Export as PDF, Markdown, or plain text for maximum flexibility.
            </p>
          </div>
          <div className="p-8 border border-neutral-100 rounded-sm">
            <Icon icon="mdi:account-group" className="text-4xl text-purple-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">Team sharing</h3>
            <p className="text-neutral-600 leading-relaxed">
              Share with team members with expiration dates, watermarks, and access controls for Enterprise.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingPanelSection() {
  return (
    <section id="floating-panel" className="border-y border-neutral-100">
      <FloatingPanelHeader />
      <FloatingPanelContent />
    </section>
  );
}

function FloatingPanelHeader() {
  return (
    <div className="text-center py-12 px-4 lg:px-0">
      <div className="inline-block px-4 py-1.5 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white opacity-50 text-xs font-medium mb-4">
        Coming Soon
      </div>
      <h2 className="text-3xl font-serif text-stone-600 mb-4">Floating panel for meetings</h2>
      <p className="text-neutral-600 max-w-3xl mx-auto">
        A compact overlay that stays on top during meetings but won't show when you share your screen.
      </p>
    </div>
  );
}

function FloatingPanelContent() {
  return (
    <div className="border-t border-neutral-100">
      <FloatingPanelDesktop />
      <FloatingPanelMobile />
    </div>
  );
}

function FloatingPanelDesktop() {
  const [selectedTab, setSelectedTab] = useState<number>(0);

  const tabs = [
    {
      title: "Compact Mode",
      description:
        "The default collapsed overlay that indicates the meeting is being listened to. Minimal and unobtrusive, staying out of your way.",
      image:
        "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/float-compact.jpg",
    },
    {
      title: "Memos",
      description:
        "Take quick notes during the meeting. Jot down important points, ideas, or reminders without losing focus on the conversation.",
      image: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/float-memos.jpg",
    },
    {
      title: "Transcript",
      description:
        "Watch the live transcript as the conversation unfolds in real-time, so you never miss what was said during the meeting.",
      image:
        "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/float-transcript.jpg",
    },
    {
      title: "Live Insights",
      description:
        "Get a rolling summary of the past 5 minutes with AI-powered suggestions. For sales calls, receive prompts for qualification questions and next steps.",
      image:
        "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/float-insights.jpg",
    },
    {
      title: "Chat",
      description:
        "Ask questions and get instant answers during the meeting. Query the transcript, get clarifications, or find specific information on the fly.",
      image: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/float-chat.jpg",
    },
  ];

  return (
    <div className="min-[800px]:grid hidden grid-cols-2">
      <div className="border-r border-neutral-100 relative overflow-hidden" style={{ paddingBottom: "56.25%" }}>
        <div className="absolute inset-0 overflow-y-auto">
          {tabs.map((tab, index) => (
            <div
              key={index}
              onClick={() => setSelectedTab(index)}
              className={cn([
                "p-6 cursor-pointer transition-colors",
                index < tabs.length - 1 && "border-b border-neutral-100",
                selectedTab === index ? "bg-stone-50" : "hover:bg-neutral-50",
              ])}
            >
              <p className="text-sm text-neutral-600 leading-relaxed">
                <span className="font-semibold text-stone-800">{tab.title}</span> – {tab.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="aspect-4/3 overflow-hidden bg-neutral-100 flex items-center justify-center">
        <img
          src={tabs[selectedTab].image}
          alt={`${tabs[selectedTab].title} preview`}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

function FloatingPanelMobile() {
  return (
    <div className="max-[800px]:block hidden">
      <div className="aspect-video border-b border-neutral-100 overflow-hidden bg-neutral-100">
        <img
          src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/float-compact.jpg"
          alt="Floating panel preview"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-6 border-b border-neutral-100">
        <p className="text-sm text-neutral-600 leading-relaxed">
          <span className="font-semibold text-stone-800">Compact Mode</span>{" "}
          – The default collapsed overlay that indicates the meeting is being listened to. Minimal and unobtrusive,
          staying out of your way.
        </p>
      </div>
      <div className="p-6 border-b border-neutral-100">
        <p className="text-sm text-neutral-600 leading-relaxed">
          <span className="font-semibold text-stone-800">Memos</span>{" "}
          – Take quick notes during the meeting. Jot down important points, ideas, or reminders without losing focus on
          the conversation.
        </p>
      </div>
      <div className="p-6 border-b border-neutral-100">
        <p className="text-sm text-neutral-600 leading-relaxed">
          <span className="font-semibold text-stone-800">Transcript</span>{" "}
          – Watch the live transcript as the conversation unfolds in real-time, so you never miss what was said during
          the meeting.
        </p>
      </div>
      <div className="p-6 border-b border-neutral-100">
        <p className="text-sm text-neutral-600 leading-relaxed">
          <span className="font-semibold text-stone-800">Live Insights</span>{" "}
          – Get a rolling summary of the past 5 minutes with AI-powered suggestions. For sales calls, receive prompts
          for qualification questions and next steps.
        </p>
      </div>
      <div className="p-6">
        <p className="text-sm text-neutral-600 leading-relaxed">
          <span className="font-semibold text-stone-800">Chat</span>{" "}
          – Ask questions and get instant answers during the meeting. Query the transcript, get clarifications, or find
          specific information on the fly.
        </p>
      </div>
    </div>
  );
}

function CTASection() {
  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 lg:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <img
            src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/icon.png"
            alt="Hyprnote"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          The complete AI notetaking solution
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          From live meetings to archived recordings, handle all your audio transcription and AI summary needs with one
          powerful tool
        </p>
        <div className="pt-6">
          <a
            href="https://hyprnote.com/download"
            className={cn([
              "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
              "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "transition-all",
            ])}
          >
            Download for free
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
