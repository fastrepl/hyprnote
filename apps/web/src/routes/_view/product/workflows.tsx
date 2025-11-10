import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_view/product/workflows")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Workflows - Hyprnote" },
      {
        name: "description",
        content: "Automate your meeting workflow with powerful automation. No coding required. Workflows coming soon.",
      },
    ],
  }),
});

const DRAGGABLE_ICONS = [
  { left: "15%", top: "25%", rotate: "-8deg", size: 76, flowDirection: "in", image: "slack.jpg" },
  { left: "78%", top: "28%", rotate: "5deg", size: 84, flowDirection: "out", image: "linear.jpg" },
  { left: "20%", top: "70%", rotate: "12deg", size: 72, flowDirection: "in", image: "notion.jpg" },
  { left: "82%", top: "72%", rotate: "-6deg", size: 80, flowDirection: "out", image: "salesforce.jpg" },
  { left: "10%", top: "48%", rotate: "3deg", size: 78, flowDirection: "out", image: "affinity.jpg" },
  { left: "88%", top: "50%", rotate: "-10deg", size: 74, flowDirection: "in", image: "attio.jpg" },
  { left: "35%", top: "22%", rotate: "8deg", size: 70, flowDirection: "in", image: "gcal.jpg" },
  { left: "60%", top: "20%", rotate: "-4deg", size: 82, flowDirection: "out", image: "gmail.jpg" },
  { left: "48%", top: "75%", rotate: "6deg", size: 76, flowDirection: "in", image: "hubspot.jpg" },
  { left: "65%", top: "78%", rotate: "-8deg", size: 72, flowDirection: "out", image: "jira.jpg" },
  { left: "5%", top: "10%", rotate: "10deg", size: 68, flowDirection: "in", image: "obsidian.jpg" },
] as const;

function Component() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fixedIconRef = useRef<HTMLDivElement>(null);
  const [fixedIconRect, setFixedIconRect] = useState<DOMRect | null>(null);
  const [draggablePositions, setDraggablePositions] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const updateFixedIconRect = () => {
      if (fixedIconRef.current) {
        setFixedIconRect(fixedIconRef.current.getBoundingClientRect());
      }
    };

    updateFixedIconRect();
    window.addEventListener("resize", updateFixedIconRect);
    window.addEventListener("scroll", updateFixedIconRect);

    return () => {
      window.removeEventListener("resize", updateFixedIconRect);
      window.removeEventListener("scroll", updateFixedIconRect);
    };
  }, []);

  const handleDraggablePositionChange = useCallback((index: number, pos: { x: number; y: number }) => {
    setDraggablePositions((prev) => {
      const newPositions = [...prev];
      newPositions[index] = pos;
      return newPositions;
    });
  }, []);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen relative"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        {/* Hero Section */}
        <div ref={containerRef} className="h-[calc(100vh-65px)] relative overflow-hidden">
          {/* SVG for connection lines - fixed position */}
          {fixedIconRect && (
            <svg
              className="fixed inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 15 }}
            >
              <defs>
                <linearGradient id="beam-gradient-in" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(120, 113, 108, 0)" />
                  <stop offset="50%" stopColor="rgba(120, 113, 108, 0.4)" />
                  <stop offset="100%" stopColor="rgba(120, 113, 108, 0)" />
                </linearGradient>
                <linearGradient id="beam-gradient-out" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(120, 113, 108, 0)" />
                  <stop offset="50%" stopColor="rgba(120, 113, 108, 0.4)" />
                  <stop offset="100%" stopColor="rgba(120, 113, 108, 0)" />
                </linearGradient>
              </defs>
              {DRAGGABLE_ICONS.map((icon, idx) => {
                const draggablePos = draggablePositions[idx];
                if (!draggablePos) {
                  return null;
                }

                const startX = fixedIconRect.left + fixedIconRect.width / 2;
                const startY = fixedIconRect.top + fixedIconRect.height / 2;
                const endX = draggablePos.x + icon.size / 2;
                const endY = draggablePos.y + icon.size / 2;

                // Calculate control points for a curved path (quadratic bezier)
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                // Add some sag/looseness by offsetting the control point perpendicular to the line
                const dx = endX - startX;
                const dy = endY - startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const sag = distance * 0.15; // 15% sag for looseness

                // Perpendicular offset
                const offsetX = -dy / distance * sag;
                const offsetY = dx / distance * sag;

                const controlX = midX + offsetX;
                const controlY = midY + offsetY;

                const pathData = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

                return (
                  <g key={idx}>
                    <path
                      d={pathData}
                      stroke="rgba(120, 113, 108, 0.3)"
                      strokeWidth="2"
                      strokeDasharray="8 8"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Draggable icons */}
          {DRAGGABLE_ICONS.map((icon, idx) => (
            <DraggableIcon
              key={idx}
              initialPosition={{ left: icon.left, top: icon.top, rotate: icon.rotate }}
              size={icon.size}
              image={icon.image}
              onPositionChange={(pos) => handleDraggablePositionChange(idx, pos)}
            />
          ))}

          <div className="bg-[linear-gradient(to_bottom,rgba(245,245,244,0.2),white_50%,rgba(245,245,244,0.3))] px-6 h-full flex items-center justify-center relative z-10 pointer-events-none">
            <div className="text-center max-w-4xl mx-auto pointer-events-auto">
              {/* Fixed icon - styled like CTA section */}
              <div
                ref={fixedIconRef}
                className="mb-8 mx-auto size-32 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[40px] bg-white relative z-30"
              >
                <Image
                  src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/icon.png"
                  alt="Hyprnote"
                  width={112}
                  height={112}
                  className="size-28 rounded-[32px] border border-neutral-100"
                />
              </div>

              <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
                Automate your workflow with powerful automation
              </h1>
              <p className="text-lg sm:text-xl text-neutral-600">
                Automate repetitive tasks with powerful workflows. No coding required.
              </p>
              <div className="mt-8">
                <button
                  disabled
                  className={cn([
                    "inline-block px-8 py-3 text-base font-medium rounded-full",
                    "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                    "opacity-50 cursor-not-allowed",
                  ])}
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations Section */}
        <IntegrationsSection />
      </div>
    </div>
  );
}

function IntegrationsSection() {
  const integrations = [
    { name: "Slack", image: "slack.jpg", description: "Team communication and collaboration" },
    { name: "Linear", image: "linear.jpg", description: "Issue tracking and project management" },
    { name: "Notion", image: "notion.jpg", description: "All-in-one workspace" },
    { name: "Salesforce", image: "salesforce.jpg", description: "Customer relationship management" },
    { name: "Affinity", image: "affinity.jpg", description: "Relationship intelligence platform" },
    { name: "Attio", image: "attio.jpg", description: "Modern CRM for startups" },
    { name: "Google Calendar", image: "gcal.jpg", description: "Calendar and scheduling" },
    { name: "Gmail", image: "gmail.jpg", description: "Email and communication" },
    { name: "HubSpot", image: "hubspot.jpg", description: "Marketing and sales platform" },
    { name: "Jira", image: "jira.jpg", description: "Project tracking and agile workflows" },
    { name: "Obsidian", image: "obsidian.jpg", description: "Knowledge base and note-taking" },
  ];

  return (
    <section className="py-16 px-6 border-t border-neutral-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-stone-600 mb-4">
            Supported Integrations
          </h2>
          <p className="text-lg text-neutral-600">
            Connect Hyprnote with your favorite tools and platforms
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="group p-6 border border-neutral-200 rounded-2xl bg-white hover:shadow-lg hover:border-stone-300 transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="size-16 rounded-xl overflow-hidden border border-neutral-100 group-hover:scale-110 transition-transform duration-300">
                  <Image
                    src={`https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/${integration.image}`}
                    alt={integration.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium text-stone-700 mb-1">{integration.name}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">{integration.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-neutral-500 mb-4">
            More integrations coming soon
          </p>
          <button
            disabled
            className={cn([
              "inline-block px-6 py-2 text-sm font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "opacity-50 cursor-not-allowed",
            ])}
          >
            Request Integration
          </button>
        </div>
      </div>
    </section>
  );
}

function DraggableIcon({
  initialPosition,
  size,
  image,
  onPositionChange,
}: {
  initialPosition: { left: string; top: string; rotate: string };
  size: number;
  image: string;
  onPositionChange?: (pos: { x: number; y: number }) => void;
}) {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const iconRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (typeof window === "undefined") {
      return { x: 0, y: 0 };
    }

    const container = iconRef.current?.parentElement;
    if (!container) {
      return { x: 0, y: 0 };
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const x = (containerWidth * parseInt(initialPosition.left)) / 100 - size / 2;
    const y = (containerHeight * parseInt(initialPosition.top)) / 100 - size / 2;

    return { x, y };
  }, [initialPosition, size]);

  const getAbsolutePosition = useCallback(() => {
    if (!iconRef.current) {
      return { x: 0, y: 0 };
    }
    const rect = iconRef.current.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
    };
  }, []);

  useEffect(() => {
    const pos = calculatePosition();
    setPosition(pos);
    setTimeout(() => {
      const absPos = getAbsolutePosition();
      onPositionChange?.(absPos);
    }, 0);
  }, [calculatePosition, getAbsolutePosition, onPositionChange]);

  useEffect(() => {
    const handleResize = () => {
      if (!dragStart) {
        const pos = calculatePosition();
        setPosition(pos);
        setTimeout(() => {
          const absPos = getAbsolutePosition();
          onPositionChange?.(absPos);
        }, 0);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculatePosition, dragStart, getAbsolutePosition, onPositionChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!iconRef.current) {
      return;
    }

    iconRef.current.setPointerCapture(e.pointerId);
    setScale(1.05);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart || !iconRef.current?.hasPointerCapture(e.pointerId)) {
      return;
    }

    const container = iconRef.current.parentElement;
    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const newPos = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    setPosition(newPos);

    // Calculate absolute position directly instead of waiting for DOM update
    const absPos = {
      x: containerRect.left + newPos.x,
      y: containerRect.top + newPos.y,
    };
    onPositionChange?.(absPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!iconRef.current) {
      return;
    }

    iconRef.current.releasePointerCapture(e.pointerId);
    setScale(1);
    setDragStart(null);
  };

  return (
    <div
      ref={iconRef}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `scale(${scale}) rotate(${initialPosition.rotate})`,
        transition: dragStart ? "none" : "transform 0.2s ease-out",
        zIndex: 20,
        pointerEvents: "auto",
        userSelect: "none",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="w-full h-full shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[24px] bg-white">
        <Image
          src={`https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/${image}`}
          alt="Integration"
          width={Math.floor(size * 0.85)}
          height={Math.floor(size * 0.85)}
          className="w-[85%] h-[85%] rounded-[20px]"
          draggable={false}
        />
      </div>
    </div>
  );
}
