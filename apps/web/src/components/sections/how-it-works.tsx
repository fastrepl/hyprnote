"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import { NoteWindow } from "./how-it-works/NoteWindow";
import { RawNote } from "./how-it-works/RawNote";
import { EnhancedNote } from "./how-it-works/EnhancedNote";
import { RecordingNoteHeader } from "./hero/RecordingNoteHeader";
import { RiFlashlightFill } from "@remixicon/react";
import { cn } from "@/lib/utils";

// Static content moved outside component
const ANIMATION_TIMINGS = {
  RECORDING: 1000,
  FIRST_BAR: 3000,
  SECOND_BAR_START: 4000,
  SECOND_BAR_COMPLETE: 6000,
  RESET: 9000,
} as const;

const rawNote = "Meeting with Design Team\n\nDiscussed new feature implementation\nNeed to follow up with John re: UI specs\n\nDeadline set for next Friday\n\n";
const typingContent = "Action items:\n- Create wireframes\n- Schedule follow-up";

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

const steps = [
  {
    title: "Be a Typer",
    description:
      "Just start typing. We transcribe directly from your computer.",
  },
  {
    title: "Become Hyper",
    description: "Upgrade your notes by adding voice recordings to it.",
  },
];

export default function HowItWorks() {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref as React.RefObject<HTMLElement>, {
    once: true,
    amount: 0.5,
  });
  const [demoStep, setDemoStep] = useState(0);

  const startAnimation = useCallback(() => {
    let timeouts: NodeJS.Timeout[] = [];

    timeouts = [
      setTimeout(() => setDemoStep(1), ANIMATION_TIMINGS.RECORDING),
      setTimeout(() => setDemoStep(2), ANIMATION_TIMINGS.FIRST_BAR),
      setTimeout(() => setDemoStep(3), ANIMATION_TIMINGS.SECOND_BAR_START),
      setTimeout(() => setDemoStep(4), ANIMATION_TIMINGS.SECOND_BAR_COMPLETE),
      setTimeout(() => {
        setDemoStep(0);
        startAnimation();
      }, ANIMATION_TIMINGS.RESET),
    ];

    return timeouts;
  }, []);

  useEffect(() => {
    if (!isInView) return;

    controls.start("visible");
    const timeouts = startAnimation();

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [controls, isInView, startAnimation]);

  const animationVariants = useMemo(() => {
    return {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { delay: 0.2 },
      },
    };
  }, []);

  return (
    <section className="py-24 bg-gradient-to-b from-white to-muted/20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            How <span className="font-racing-sans">HYPRNOTE</span> works
          </h2>
          <p className="text-muted-foreground">
            Transform your raw notes into powerful insights within seconds
          </p>
        </div>

        <div className="flex justify-center mb-16">
          <div ref={ref}>
            <NoteWindow>
              <RecordingNoteHeader />
              <div className="relative">
                <RawNote
                  className={cn(
                    "transition-opacity duration-500",
                    demoStep >= 4 ? "opacity-0" : "opacity-100"
                  )}
                  content={rawNote}
                  typingContent={demoStep < 4 ? typingContent : undefined}
                  isRecording={demoStep < 3}
                />
                <EnhancedNote
                  className={cn(
                    "absolute top-0 left-0 right-0 transition-opacity duration-500",
                    demoStep >= 4 ? "opacity-100" : "opacity-0"
                  )}
                  title="Meeting with Design Team"
                  content={enhancedContent}
                  animateLines={demoStep === 4}
                />
                {demoStep < 3 ? (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg cursor-default"
                  >
                    Stop Recording
                  </motion.button>
                ) : (
                  demoStep === 3 && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#fbbf24] to-[#2563eb] text-white rounded-lg cursor-default"
                    >
                      <RiFlashlightFill className="w-4 h-4" />
                      Hypercharge
                    </motion.button>
                  )
                )}
              </div>
            </NoteWindow>
          </div>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial="hidden"
              animate={controls}
              variants={animationVariants}
              className="text-center relative"
            >
              <div className="mb-4">
                <h3
                  className={cn(
                    "text-lg font-semibold mb-2",
                    (index === 0 && demoStep === 1) ||
                      (index === 1 && (demoStep === 1 || demoStep === 3)) ||
                      (index === 2 && demoStep >= 4)
                      ? "text-primary"
                      : ""
                  )}
                >
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      index === 0
                        ? demoStep >= 1
                          ? "100%"
                          : "0%"
                        : index === 1
                          ? demoStep >= 3
                            ? "100%"
                            : "0%"
                          : "0%",
                  }}
                  transition={{
                    duration: demoStep === 0 ? 0 : index === 0 ? 3 : 4,
                    ease: "linear",
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
