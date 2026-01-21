"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
}

const WEIGHTS = ["normal", "350", "700"] as const;

function getRandomWeight(): string {
  return WEIGHTS[Math.floor(Math.random() * WEIGHTS.length)];
}

export function AnimatedText({ text, className = "" }: AnimatedTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [letterWeights, setLetterWeights] = useState<string[]>(() =>
    text.split("").map(() => getRandomWeight()),
  );

  useEffect(() => {
    setLetterWeights(text.split("").map(() => getRandomWeight()));
  }, [text]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleMouseMove = () => {
      if (timeoutId) return;
      setLetterWeights(text.split("").map(() => getRandomWeight()));
      timeoutId = setTimeout(() => {
        timeoutId = null;
      }, 150);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [text]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={{ fontFamily: "Redaction" }}
    >
      {text.split("").map((char, index) => (
        <span
          key={index}
          style={{ fontWeight: letterWeights[index] || "normal" }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}
