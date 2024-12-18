"use client";

import {
  RiPencilFill,
  RiArrowRightSLine,
  RiFlashlightFill,
} from "@remixicon/react";
import { NoteWindow } from "./demo/NoteWindow";
import { NoteHeader } from "./demo/NoteHeader";
import { RawNote } from "./demo/RawNote";
import { EnhancedNote } from "./demo/EnhancedNote";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function Demo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Start animation sequence
      const step1 = setTimeout(() => setAnimationStep(1), 500); // After becomes blurry
      const step2 = setTimeout(() => setAnimationStep(2), 1000); // Before becomes blurry, After clear
      const step3 = setTimeout(() => setAnimationStep(3), 1500); // Both clear

      return () => {
        clearTimeout(step1);
        clearTimeout(step2);
        clearTimeout(step3);
      };
    }
  }, [isVisible]);

  const getBeforeClassName = () => {
    if (!isVisible) return "opacity-0";
    if (animationStep === 0) return "opacity-100";
    if (animationStep === 1) return "opacity-100";
    if (animationStep === 2) return "opacity-40 blur-[2px]";
    return "opacity-100";
  };

  const getAfterClassName = () => {
    if (!isVisible) return "opacity-0";
    if (animationStep === 0) return "opacity-40 blur-[2px]";
    if (animationStep === 1) return "opacity-40 blur-[2px]";
    if (animationStep === 2) return "opacity-100";
    return "opacity-100";
  };

  const rawNote =
    "Meeting with Design Team\n\nDiscussed new feature implementation\nNeed to follow up with John re: UI specs\n\nDeadline set for next Friday\n\nAction items:\n- Create wireframes\n- Schedule follow-up";

  const enhancedContent = {
    description:
      "Discussed new feature implementation for the upcoming product release. The team expressed enthusiasm about the innovative approach. Need to follow up with John regarding UI specifications and design system integration.",
    deadline: {
      date: "Next Friday",
      note: "Team agreed to prioritize this feature for Q1 roadmap",
    },
    keyPoints: [
      "Design system consistency",
      "accessibility requirements",
      "mobile-first approach",
    ],
    actionItems: [
      "Create wireframes with focus on responsive layouts",
      "Schedule follow-up meeting with design system team",
      "Review accessibility guidelines",
      "Prepare prototype for stakeholder review",
    ],
  };

  return (
    <div
      ref={containerRef}
      className="flex gap-8 items-center justify-center w-full mt-20"
    >
      {/* Before - Raw Note Taking */}
      <NoteWindow className={getBeforeClassName()}>
        <NoteHeader
          title="Meeting with Design Team"
          badge={{
            icon: <RiPencilFill className="w-3 h-3" />,
            text: "Draft",
            color: "gray",
          }}
        />
        <RawNote content={rawNote} />
      </NoteWindow>

      <RiArrowRightSLine
        className={`w-8 h-8 text-gray-500 transition-opacity duration-1000 ${!isVisible ? "opacity-0" : "opacity-100"}`}
      />

      {/* After - Enhanced Note */}
      <NoteWindow
        className={cn(
          getAfterClassName(),
          "shadow-yellow-600/30 hover:scale-110 hover:ml-4"
        )}
      >
        <NoteHeader
          title="Meeting with Design Team"
          badge={{
            icon: <RiFlashlightFill className="w-3 h-3" />,
            text: "Hypercharged",
            color: "blue",
          }}
        />
        <EnhancedNote
          title="Meeting with Design Team"
          content={enhancedContent}
        />
      </NoteWindow>
    </div>
  );
}
