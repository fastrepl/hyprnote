import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { cn } from "@hypr/utils";

import { MockWindow } from "@/components/mock-window";

const aboutSearchSchema = z.object({
  section: z.enum(["us", "founders", "team"]).optional().default("us"),
});

export const Route = createFileRoute("/_view/about")({
  component: Component,
  validateSearch: aboutSearchSchema,
  head: () => ({
    meta: [
      { title: "Team - Hyprnote Press Kit" },
      {
        name: "description",
        content: "Meet the Hyprnote team and download team photos.",
      },
    ],
  }),
});

const founders = [
  {
    id: "john",
    name: "John Jeong",
    role: "Co-founder & CEO",
    bio: "Building tools that help people be more productive without compromising privacy. Passionate about local-first software and AI.",
    image:
      "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/john.png",
    links: {
      twitter: "https://x.com/computeless",
      github: "https://github.com/computelesscomputer",
      linkedin: "https://linkedin.com/in/johntopia",
      email: "john@hyprnote.com",
    },
  },
  {
    id: "yujong",
    name: "Yujong",
    role: "Co-founder",
    bio: "Focused on creating privacy-first productivity tools that respect user data and enhance workflows.",
    image:
      "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yujong.png",
    links: {
      twitter: "https://x.com/yujonglee",
      github: "https://github.com/yujonglee",
      linkedin: "https://linkedin.com/in/yujong1ee",
      email: "yujonglee@hyprnote.com",
    },
  },
];

const teamMembers = [
  {
    id: "engineering",
    name: "Engineering Team",
    role: "Product & Development",
    bio: "Building the future of local-first, privacy-focused productivity tools.",
    image:
      "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/team.png",
    links: {
      email: "team@hyprnote.com",
    },
  },
];

const allMembers = [
  { type: "founder" as const, ...founders[0] },
  { type: "founder" as const, ...founders[1] },
  { type: "team" as const, ...teamMembers[0] },
];

function Component() {
  const { section } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [selectedMember, setSelectedMember] = useState(allMembers[0]);
  const [showStoryModal, setShowStoryModal] = useState(false);

  const sections = [
    { id: "us", label: "Our Story", icon: "mdi:file-document-outline" },
    { id: "founders", label: "Founders", icon: "mdi:account-star" },
    { id: "team", label: "Team", icon: "mdi:account-group" },
  ] as const;

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        {/* Navigation and Section Header */}
        <div className="px-6 pt-8 lg:pt-12">
          <div className="max-w-4xl mx-auto">
            {/* Section Navigation */}
            <div className="flex gap-2 mb-6">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate({ search: { section: s.id } })}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium",
                    section === s.id
                      ? "bg-stone-600 text-white shadow-md"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:border-stone-400 hover:bg-stone-50",
                  )}
                >
                  <Icon icon={s.icon} className="text-lg" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Our Story Document */}
        {section === "us" && (
          <section className="px-6 pb-8 lg:pb-12">
            <div className="max-w-4xl mx-auto">
              <MockWindow
                title="About / Us"
                className="rounded-lg w-full max-w-none"
              >
                <div className="p-8">
                  <button
                    onClick={() => setShowStoryModal(true)}
                    className="group w-full flex items-center gap-4 p-6 bg-white border border-neutral-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-stone-50 rounded-lg border border-neutral-200 group-hover:bg-blue-50 group-hover:border-blue-300 transition-colors">
                      <Icon
                        icon="mdi:file-document-outline"
                        className="text-2xl text-stone-600 group-hover:text-blue-600"
                      />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-lg font-medium text-stone-600 mb-1">
                        Our Story.txt
                      </h3>
                      <p className="text-sm text-neutral-500">
                        Learn about Hyprnote's journey and mission
                      </p>
                    </div>
                    <Icon
                      icon="mdi:chevron-right"
                      className="text-2xl text-neutral-400 group-hover:text-blue-600 transition-colors"
                    />
                  </button>
                </div>

                {/* Status bar */}
                <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
                  <span className="text-xs text-neutral-500">1 item</span>
                </div>
              </MockWindow>
            </div>
          </section>
        )}

        {/* Founders Section */}
        {section === "founders" && (
          <section className="px-6 pb-8 lg:pb-12">
            <div className="max-w-4xl mx-auto">
              <MockWindow
                title="About / Founders"
                className="rounded-lg w-full max-w-none"
              >
                <div className="p-8">
                  {/* Founders Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {founders.map((founder) => (
                      <button
                        key={founder.id}
                        onClick={() =>
                          setSelectedMember({ type: "founder", ...founder })
                        }
                        className={cn([
                          "group flex flex-col items-center text-center p-4 rounded-lg transition-colors",
                          selectedMember.id === founder.id
                            ? "bg-blue-100"
                            : "hover:bg-stone-50",
                        ])}
                      >
                        <div className="mb-3 w-16 h-16 rounded-full overflow-hidden border-2 border-neutral-200 group-hover:border-blue-400 transition-colors">
                          <img
                            src={founder.image}
                            alt={founder.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="font-medium text-stone-600 text-sm">
                          {founder.name}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Details Panel */}
                  <div className="mt-8 border-t border-neutral-100 pt-8">
                    <div className="max-w-2xl mx-auto">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Image */}
                        <a
                          href={selectedMember.image}
                          download={`${selectedMember.name.toLowerCase().replace(" ", "-")}.png`}
                          className="group relative block aspect-square bg-stone-50 border border-neutral-200 rounded-lg overflow-hidden md:w-64 shrink-0"
                        >
                          <img
                            src={selectedMember.image}
                            alt={selectedMember.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                              <Icon
                                icon="mdi:download"
                                className="text-2xl text-stone-600"
                              />
                            </div>
                          </div>
                        </a>

                        {/* Info */}
                        <div className="flex-1">
                          <h2 className="text-2xl font-serif text-stone-600 mb-1">
                            {selectedMember.name}
                          </h2>
                          <p className="text-sm text-neutral-500 uppercase tracking-wider mb-4">
                            {selectedMember.role}
                          </p>
                          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                            {selectedMember.bio}
                          </p>

                          {/* Contact Links */}
                          {selectedMember.links && (
                            <div className="flex flex-wrap gap-2">
                              {selectedMember.links.email && (
                                <a
                                  href={`mailto:${selectedMember.links.email}`}
                                  className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                                  aria-label="Email"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Email</span>
                                </a>
                              )}
                              {"twitter" in selectedMember.links &&
                                selectedMember.links.twitter && (
                                  <a
                                    href={selectedMember.links.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                                    aria-label="Twitter"
                                  >
                                    <Icon
                                      icon="mdi:twitter"
                                      className="text-sm"
                                    />
                                    <span>Twitter</span>
                                  </a>
                                )}
                              {"github" in selectedMember.links &&
                                selectedMember.links.github && (
                                  <a
                                    href={selectedMember.links.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                                    aria-label="GitHub"
                                  >
                                    <Icon
                                      icon="mdi:github"
                                      className="text-sm"
                                    />
                                    <span>GitHub</span>
                                  </a>
                                )}
                              {"linkedin" in selectedMember.links &&
                                selectedMember.links.linkedin && (
                                  <a
                                    href={selectedMember.links.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                                    aria-label="LinkedIn"
                                  >
                                    <Icon
                                      icon="mdi:linkedin"
                                      className="text-sm"
                                    />
                                    <span>LinkedIn</span>
                                  </a>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Finder-style status bar */}
                <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
                  <span className="text-xs text-neutral-500">
                    {founders.length} items
                  </span>
                </div>
              </MockWindow>
            </div>
          </section>
        )}

        {/* Team Section */}
        {section === "team" && (
          <section className="px-6 pb-8 lg:pb-12">
            <div className="max-w-4xl mx-auto">
              <MockWindow
                title="About / Team"
                className="rounded-lg w-full max-w-none"
              >
                <div className="p-8">
                  {/* Team Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() =>
                          setSelectedMember({ type: "team", ...member })
                        }
                        className={cn([
                          "group flex flex-col items-center text-center p-4 rounded-lg transition-colors",
                          selectedMember.id === member.id
                            ? "bg-blue-100"
                            : "hover:bg-stone-50",
                        ])}
                      >
                        <div className="mb-3 w-16 h-16 rounded-full overflow-hidden border-2 border-neutral-200 group-hover:border-blue-400 transition-colors">
                          <img
                            src={member.image}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="font-medium text-stone-600 text-sm">
                          {member.name}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Details Panel */}
                  <div className="mt-8 border-t border-neutral-100 pt-8">
                    <div className="max-w-2xl mx-auto">
                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Image */}
                        <a
                          href={selectedMember.image}
                          download={`${selectedMember.name.toLowerCase().replace(" ", "-")}.png`}
                          className="group relative block aspect-square bg-stone-50 border border-neutral-200 rounded-lg overflow-hidden md:w-64 shrink-0"
                        >
                          <img
                            src={selectedMember.image}
                            alt={selectedMember.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                              <Icon
                                icon="mdi:download"
                                className="text-2xl text-stone-600"
                              />
                            </div>
                          </div>
                        </a>

                        {/* Info */}
                        <div className="flex-1">
                          <h2 className="text-2xl font-serif text-stone-600 mb-1">
                            {selectedMember.name}
                          </h2>
                          <p className="text-sm text-neutral-500 uppercase tracking-wider mb-4">
                            {selectedMember.role}
                          </p>
                          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
                            {selectedMember.bio}
                          </p>

                          {/* Contact Links */}
                          {selectedMember.links && (
                            <div className="flex flex-wrap gap-2">
                              {selectedMember.links.email && (
                                <a
                                  href={`mailto:${selectedMember.links.email}`}
                                  className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                                  aria-label="Email"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Email</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Finder-style status bar */}
                <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
                  <span className="text-xs text-neutral-500">
                    {teamMembers.length} items
                  </span>
                </div>
              </MockWindow>
            </div>
          </section>
        )}

        {/* Story Modal */}
        {showStoryModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowStoryModal(false)}
          >
            <div
              className="w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <MockWindow
                title="Our Story.txt"
                className="rounded-lg w-full max-w-none"
              >
                <div className="p-8 max-h-[70vh] overflow-y-auto bg-white">
                  <div className="prose prose-stone max-w-none">
                    <h2 className="text-3xl font-serif text-stone-600 mb-6">
                      Making notetaking effortless
                    </h2>
                    <p className="text-lg text-neutral-600 leading-relaxed mb-6">
                      We believe that capturing and organizing your
                      conversations shouldn't be a chore. That's why we built
                      Hyprnote - a tool that listens, learns, and helps you
                      remember what matters.
                    </p>

                    <h3 className="text-2xl font-serif text-stone-600 mb-4 mt-8">
                      Our Mission
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                        <Icon
                          icon="mdi:shield-lock"
                          className="text-3xl text-stone-600 mb-3"
                        />
                        <h4 className="text-lg font-serif text-stone-600 mb-2">
                          Privacy First
                        </h4>
                        <p className="text-sm text-neutral-600">
                          Your conversations are personal. We process everything
                          locally on your device using on-device AI, so your
                          data never leaves your computer.
                        </p>
                      </div>
                      <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                        <Icon
                          icon="mdi:lightning-bolt"
                          className="text-3xl text-stone-600 mb-3"
                        />
                        <h4 className="text-lg font-serif text-stone-600 mb-2">
                          Effortless Capture
                        </h4>
                        <p className="text-sm text-neutral-600">
                          Stop worrying about missing important details.
                          Hyprnote captures both your mic and system audio,
                          giving you complete context for every conversation.
                        </p>
                      </div>
                      <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                        <Icon
                          icon="mdi:brain"
                          className="text-3xl text-stone-600 mb-3"
                        />
                        <h4 className="text-lg font-serif text-stone-600 mb-2">
                          Intelligent Organization
                        </h4>
                        <p className="text-sm text-neutral-600">
                          AI helps you find what matters. Automatic
                          transcription, smart summaries, and searchable notes
                          mean you'll never lose track of important information.
                        </p>
                      </div>
                      <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                        <Icon
                          icon="mdi:tools"
                          className="text-3xl text-stone-600 mb-3"
                        />
                        <h4 className="text-lg font-serif text-stone-600 mb-2">
                          Built for Everyone
                        </h4>
                        <p className="text-sm text-neutral-600">
                          From remote workers to students, from entrepreneurs to
                          executives - Hyprnote adapts to your workflow and
                          helps you work smarter.
                        </p>
                      </div>
                    </div>

                    <h3 className="text-2xl font-serif text-stone-600 mb-4 mt-8">
                      Our Story
                    </h3>
                    <p className="text-base text-neutral-600 leading-relaxed mb-4">
                      Hyprnote was born from a simple frustration: trying to
                      take notes while staying engaged in important
                      conversations. Whether it was a crucial client call, a
                      brainstorming session with the team, or an online lecture,
                      we found ourselves constantly torn between listening and
                      writing.
                    </p>
                    <p className="text-base text-neutral-600 leading-relaxed mb-4">
                      We looked for solutions, but everything required bots
                      joining meetings, cloud uploads, or compromising on
                      privacy. We knew there had to be a better way.
                    </p>
                    <p className="text-base text-neutral-600 leading-relaxed mb-6">
                      That's when we started building Hyprnote - a desktop
                      application that captures audio locally, processes it with
                      on-device AI, and gives you the freedom to be fully
                      present in your conversations while never missing a
                      detail.
                    </p>

                    <h3 className="text-2xl font-serif text-stone-600 mb-4 mt-8">
                      What We Stand For
                    </h3>
                    <div className="space-y-4 mb-6">
                      <div className="flex gap-4 items-start p-4 border border-neutral-200 rounded-lg bg-white">
                        <Icon
                          icon="mdi:lock"
                          className="text-2xl text-stone-600 shrink-0 mt-1"
                        />
                        <div>
                          <h4 className="text-base font-serif text-stone-600 mb-1">
                            Privacy is non-negotiable
                          </h4>
                          <p className="text-sm text-neutral-600">
                            We will never compromise on privacy. Your data
                            belongs to you, period.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start p-4 border border-neutral-200 rounded-lg bg-white">
                        <Icon
                          icon="mdi:transparency"
                          className="text-2xl text-stone-600 shrink-0 mt-1"
                        />
                        <div>
                          <h4 className="text-base font-serif text-stone-600 mb-1">
                            Transparency in everything
                          </h4>
                          <p className="text-sm text-neutral-600">
                            We're open about how Hyprnote works, from our tech
                            stack to our pricing model.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start p-4 border border-neutral-200 rounded-lg bg-white">
                        <Icon
                          icon="mdi:account-group"
                          className="text-2xl text-stone-600 shrink-0 mt-1"
                        />
                        <div>
                          <h4 className="text-base font-serif text-stone-600 mb-1">
                            Community-driven development
                          </h4>
                          <p className="text-sm text-neutral-600">
                            We build features our users actually need, guided by
                            your feedback and requests.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 items-start p-4 border border-neutral-200 rounded-lg bg-white">
                        <Icon
                          icon="mdi:rocket"
                          className="text-2xl text-stone-600 shrink-0 mt-1"
                        />
                        <div>
                          <h4 className="text-base font-serif text-stone-600 mb-1">
                            Continuous improvement
                          </h4>
                          <p className="text-sm text-neutral-600">
                            We ship updates regularly and are always working to
                            make Hyprnote better.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-stone-50 border border-neutral-200 rounded-lg p-6 text-center mt-8">
                      <h4 className="text-xl font-serif text-stone-600 mb-2">
                        Built by Fastrepl
                      </h4>
                      <p className="text-sm text-neutral-600 mb-4">
                        Hyprnote is developed by Fastrepl, a team dedicated to
                        building productivity tools that respect your privacy
                        and enhance your workflow.
                      </p>
                      <div className="flex justify-center gap-3">
                        <a
                          href="https://github.com/fastrepl/hyprnote"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-neutral-300 text-stone-600 rounded-full hover:bg-white transition-colors"
                        >
                          <Icon icon="mdi:github" className="text-base" />
                          <span>View on GitHub</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2 flex justify-between items-center">
                  <span className="text-xs text-neutral-500">
                    Our Story.txt
                  </span>
                  <button
                    onClick={() => setShowStoryModal(false)}
                    className="px-3 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded transition-colors"
                  >
                    Close
                  </button>
                </div>
              </MockWindow>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
