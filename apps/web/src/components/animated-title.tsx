"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedTitleProps {
  text: string;
  className?: string;
}

export function AnimatedTitle({ text, className = "" }: AnimatedTitleProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const [letterStyles, setLetterStyles] = useState<number[]>([]);

  useEffect(() => {
    setLetterStyles(new Array(text.length).fill(0));
  }, [text]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const spans = containerRef.current.querySelectorAll("span[data-char]");
      const newStyles: number[] = [];

      spans.forEach((span) => {
        const rect = span.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2),
        );

        const maxDistance = 150;
        const intensity = Math.max(0, 1 - distance / maxDistance);
        newStyles.push(intensity);
      });

      setLetterStyles(newStyles);
    };

    const handleMouseLeave = () => {
      setLetterStyles(new Array(text.length).fill(0));
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [text.length]);

  return (
    <h1 ref={containerRef} className={className}>
      {text.split("").map((char, index) => {
        const intensity = letterStyles[index] || 0;
        const isActive = intensity > 0.1;

        return (
          <span
            key={index}
            data-char
            className="inline-block transition-all duration-150 ease-out"
            style={{
              fontStyle: isActive ? "italic" : "normal",
              fontFamily: isActive
                ? "ui-serif, Georgia, Cambria, Times New Roman, Times, serif"
                : "inherit",
              transform: isActive
                ? `scale(${1 + intensity * 0.05})`
                : "scale(1)",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </h1>
  );
}
