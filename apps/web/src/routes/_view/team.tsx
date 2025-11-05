import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/team")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Meet the Team - Hyprnote" },
      {
        name: "description",
        content: "Meet the team behind Hyprnote, building the future of private, local-first notetaking.",
      },
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
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-16 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Meet the Team
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              We're a small team passionate about building tools that help people work better while respecting their
              privacy.
            </p>
          </header>

          <section className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-serif text-stone-600 mb-4">Built by Fastrepl</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Hyprnote is developed by Fastrepl, a team dedicated to creating productivity tools that prioritize
                privacy and user experience.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
              <TeamMember
                name="John Jeong"
                role="Co-founder & CEO"
                bio="Building tools that help people be more productive without compromising privacy."
                links={{
                  twitter: "https://twitter.com/johnjeong",
                  github: "https://github.com/johnjeong",
                  linkedin: "https://linkedin.com/in/johnjeong",
                }}
              />
              <TeamMember
                name="Engineering Team"
                role="Product & Development"
                bio="Building the future of local-first, privacy-focused productivity tools."
                links={{
                  github: "https://github.com/fastrepl",
                }}
              />
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              How We Work
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <WorkValue
                icon="mdi:rocket-launch"
                title="Ship Fast"
                description="We believe in rapid iteration and getting features into users' hands quickly."
              />
              <WorkValue
                icon="mdi:account-heart"
                title="User-Focused"
                description="Every decision is guided by what's best for our users and their privacy."
              />
              <WorkValue
                icon="mdi:transparency"
                title="Build in Public"
                description="We're open about our progress, challenges, and roadmap with our community."
              />
            </div>
          </section>

          <section className="mb-20">
            <div className="text-center mb-12">
              <Icon icon="mdi:open-source-initiative" className="text-5xl text-stone-600 mx-auto mb-4" />
              <h2 className="text-3xl font-serif text-stone-600 mb-4">Open Source</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto mb-8">
                Hyprnote is open source. We believe in transparency and welcome contributions from the community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://github.com/fastrepl/hyprnote"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn([
                    "inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-full",
                    "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                    "hover:scale-105 active:scale-95 transition-transform",
                  ])}
                >
                  <Icon icon="mdi:github" className="text-xl" />
                  <span>View on GitHub</span>
                </a>
                <a
                  href="https://github.com/fastrepl/hyprnote/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn([
                    "inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-full",
                    "border border-neutral-300 text-stone-600",
                    "hover:bg-stone-50 transition-colors",
                  ])}
                >
                  <Icon icon="mdi:forum" className="text-xl" />
                  <span>Join Discussions</span>
                </a>
              </div>
            </div>
          </section>

          <section className="text-center bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">Join Our Community</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Whether you want to contribute code, share feedback, or just connect with other users, we'd love to have
              you in our community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/discord"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-full",
                  "bg-[#5865F2] text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                <Icon icon="mdi:discord" className="text-xl" />
                <span>Join Discord</span>
              </a>
              <a
                href="/x"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-stone-50 transition-colors",
                ])}
              >
                <Icon icon="mdi:twitter" className="text-xl" />
                <span>Follow on Twitter</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TeamMember({
  name,
  role,
  bio,
  links,
}: {
  name: string;
  role: string;
  bio: string;
  links?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
}) {
  return (
    <div className="p-8 border border-neutral-200 rounded-lg bg-white">
      <div className="mb-4">
        <h3 className="text-2xl font-serif text-stone-600 mb-1">{name}</h3>
        <p className="text-sm text-neutral-500 uppercase tracking-wider">{role}</p>
      </div>
      <p className="text-neutral-600 mb-6">{bio}</p>
      {links && (
        <div className="flex gap-3">
          {links.twitter && (
            <a
              href={links.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-stone-600 transition-colors"
              aria-label="Twitter"
            >
              <Icon icon="mdi:twitter" className="text-xl" />
            </a>
          )}
          {links.github && (
            <a
              href={links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-stone-600 transition-colors"
              aria-label="GitHub"
            >
              <Icon icon="mdi:github" className="text-xl" />
            </a>
          )}
          {links.linkedin && (
            <a
              href={links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-stone-600 transition-colors"
              aria-label="LinkedIn"
            >
              <Icon icon="mdi:linkedin" className="text-xl" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function WorkValue({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <Icon icon={icon} className="text-4xl text-stone-600 mx-auto mb-4" />
      <h3 className="text-xl font-serif text-stone-600 mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}
