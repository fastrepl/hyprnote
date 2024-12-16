"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useAnimation } from "framer-motion";

const steps = [
  {
    title: "Join your meeting",
    description: "Start any meeting as usual - no need to invite bots",
  },
  {
    title: "HyprNote listens",
    description:
      "Our AI transcribes and analyzes the conversation in real-time",
  },
  {
    title: "Get smart notes",
    description: "Receive structured notes with highlights and action items",
  },
];

export default function HowItWorks() {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref as React.RefObject<HTMLElement>, {
    once: true,
  });

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [controls, isInView]);

  return (
    <section className="py-24 bg-gradient-to-b from-white to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How HyprNote works</h2>
          <p className="text-muted-foreground">
            Simple, powerful, and efficient note-taking
          </p>
        </div>

        <div
          ref={ref}
          className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial="hidden"
              animate={controls}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: index * 0.2,
                  },
                },
              }}
              style={{
                padding: "1.5rem",
                backgroundColor: "var(--background)",
                borderRadius: "0.75rem",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              }}
            >
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  backgroundColor: "rgba(var(--primary), 0.1)",
                  borderRadius: "9999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <span
                  style={{
                    color: "var(--primary)",
                    fontWeight: "bold",
                    fontSize: "1.125rem",
                  }}
                >
                  {index + 1}
                </span>
              </div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  color: "var(--muted-foreground)",
                }}
              >
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
