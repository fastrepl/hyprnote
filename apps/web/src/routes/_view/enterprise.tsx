import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { GitHubOpenSource } from "@/components/github-open-source";
import { Image } from "@/components/image";
import { MockWindow } from "@/components/mock-window";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/enterprise")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Enterprise - Hyprnote" },
      {
        name: "description",
        content: "A notetaking tool your team will actually love, with enterprise features when you need them.",
      },
      { property: "og:title", content: "Enterprise - Hyprnote" },
      {
        property: "og:description",
        content:
          "Deploy Hyprnote across your organization with flexible options for security, compliance, and deployment.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/enterprise" },
    ],
  }),
});

function Component() {
  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <DeploymentOptionsSection />
        <SlashSeparator />
        <HowWeCaptureMeetingsSection />
        <SlashSeparator />
        <ConsentSection />
        <SlashSeparator />
        <ComplianceSection />
        <SlashSeparator />
        <GitHubOpenSource />
        <SlashSeparator />
        <PhilosophySection />
        <SlashSeparator />
        <CTASection />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="flex flex-col items-center text-center gap-8 py-24 px-4 laptop:px-0">
        <div className="space-y-6 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-600">
            Enterprise
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed">
            An open-source notetaking tool your team will actually love, with enterprise features when you need them.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            to="/founders"
            className={cn([
              "px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "hover:scale-105 active:scale-95 transition-transform shadow-md hover:shadow-lg",
            ])}
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </section>
  );
}

function PhilosophySection() {
  return (
    <section className="py-16 px-4 laptop:px-0 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-[size:24px_24px] bg-[position:12px_12px,12px_12px]">
      <div className="max-w-4xl mx-auto">
        <div
          className="border border-neutral-200 p-4"
          style={{
            backgroundImage:
              "url(https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/texture/white-leather.png)",
          }}
        >
          <div
            className="bg-stone-50 border border-neutral-200 rounded-sm p-8 sm:p-12"
            style={{
              backgroundImage:
                "url(https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/texture/paper.png)",
            }}
          >
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-600 mb-6">To organizations,</h2>

            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                We built Hyprnote because we believe that great tools should empower people, not constrain them. Your
                teams deserve software that respects their intelligence, their privacy, and their agency.
              </p>
              <p>
                We're open source because transparency builds trust. We prioritize consent because respect matters. We
                give you deployment flexibility because every organization is different. And we focus on building
                something that people actually enjoy using—because adoption shouldn't require force.
              </p>
              <p>
                Whether you need secure cloud, on-premises deployment, or even bot integration (though we'd rather you
                didn't), we'll work with you. We're not here to dictate how you should work. We're here to support the
                way you choose to work.
              </p>
              <p>
                If you believe software should adapt to people instead of the other way around, we should talk.
              </p>
            </div>

            <div className="flex gap-2 mt-12 mb-4">
              <Image
                src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/john.png"
                alt="John Jeong"
                width={32}
                height={32}
                className="rounded-full object-cover border border-neutral-200"
              />
              <Image
                src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yujong.png"
                alt="Yujong Lee"
                width={32}
                height={32}
                className="rounded-full object-cover border border-neutral-200"
              />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-base text-neutral-600 font-medium italic font-serif">Hyprnote</p>
                <p className="text-sm text-neutral-500">John Jeong, Yujong Lee</p>
              </div>

              <div>
                <Image
                  src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/signature-dark.svg"
                  alt="Hyprnote Signature"
                  width={124}
                  height={60}
                  className="opacity-80 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeploymentOptionsSection() {
  return (
    <section className="py-16 px-4 laptop:px-0 bg-stone-50 border-y border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
            We adapt to your needs
          </h2>
          <p className="text-lg text-neutral-600">
            Whether you want secure cloud, on-premises, or something in between—we can make it work.
          </p>
        </div>

        <div className="space-y-6">
          <DeploymentOption
            icon="mdi:cloud-lock"
            title="Secure Cloud (Recommended)"
            description="Certified cloud infrastructure that complies with regulations. No maintenance overhead, all the security you need."
            badges={["SOC 2 (In Progress)", "End-to-end Encrypted"]}
          />

          <DeploymentOption
            icon="mdi:server"
            title="Self-Hosted / On-Premises"
            description="Deploy on your own infrastructure with Docker. Full data sovereignty—sync notes across devices and team members without data leaving your network."
            features={[
              "SSO & MFA integration",
              "Bring your own models (Bedrock, Azure OpenAI, custom endpoints)",
              "Optional TEE support on compatible infrastructure",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function DeploymentOption({
  icon,
  title,
  description,
  badges,
  features,
  note,
}: {
  icon: string;
  title: string;
  description: string;
  badges?: string[];
  features?: string[];
  note?: string;
}) {
  return (
    <div className="p-6 border border-neutral-200 rounded-lg bg-white">
      <div className="flex gap-4">
        <div className="shrink-0">
          <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center">
            <Icon icon={icon} className="text-2xl text-stone-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-serif text-stone-600 mb-2">{title}</h3>
          <p className="text-neutral-600 leading-relaxed mb-3">{description}</p>

          {badges && badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {badges.map((badge, idx) => (
                <span
                  key={idx}
                  className="text-xs font-medium text-stone-600 bg-stone-100 px-3 py-1 rounded-full"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {features && features.length > 0 && (
            <ul className="space-y-2 mb-3">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600">
                  <Icon icon="mdi:check" className="text-green-700 text-base mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {note && <p className="text-sm text-neutral-500 italic mt-2">{note}</p>}
        </div>
      </div>
    </div>
  );
}

function HowWeCaptureMeetingsSection() {
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
    <section>
      <div className="text-center border-b border-neutral-100">
        <p className="font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
          How we capture meetings
        </p>
      </div>
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="border-r border-neutral-100 flex flex-col overflow-clip">
          <div className="p-8 flex flex-col gap-4">
            <p className="text-lg font-serif text-neutral-600 leading-relaxed">
              <span className="font-semibold">When you attend meetings,</span>{" "}
              Hyprnote runs locally on your device and transcribes everything in real-time.
            </p>
          </div>
          <div className="flex-1 flex items-end justify-center px-8 pb-0 bg-stone-50/30">
            <MockWindow showAudioIndicator={enhancedLines === 0}>
              <div className="p-6 h-[300px] overflow-hidden">
                {enhancedLines === 0
                  ? (
                    <div className="transition-opacity duration-500">
                      <div className="text-neutral-700">ui update - moble</div>
                      <div className="text-neutral-700">api</div>
                      <div className="text-neutral-700 mt-4">new dash - urgnet</div>
                      <div className="text-neutral-700">a/b tst next wk</div>
                      <div className="text-neutral-700 mt-4">
                        {typedText1}
                        {typedText1 && typedText1.length < text1.length && <span className="animate-pulse">|</span>}
                      </div>
                      <div className="text-neutral-700">
                        {typedText2}
                        {typedText2 && typedText2.length < text2.length && <span className="animate-pulse">|</span>}
                      </div>
                    </div>
                  )
                  : (
                    <div className="space-y-4 transition-opacity duration-500">
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
                            Ben confirmed that API adjustments are needed to support dynamic UI changes, particularly
                            for fetching personalized user data more efficiently.
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
                            "font-lg font-semibold text-stone-700 transition-opacity duration-500",
                            enhancedLines >= 4 ? "opacity-100" : "opacity-0",
                          )}
                        >
                          New Dashboard – Urgent Priority
                        </h4>
                        <ul className="space-y-2 text-neutral-700 list-disc pl-5">
                          <li
                            className={cn(
                              "transition-opacity duration-500",
                              enhancedLines >= 4 ? "opacity-100" : "opacity-0",
                            )}
                          >
                            Alice emphasized that the new analytics dashboard must be prioritized due to increasing
                            stakeholder demand.
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
              </div>
            </MockWindow>
          </div>
        </div>
        <div className="flex flex-col overflow-clip">
          <div className="p-8 flex flex-col gap-4">
            <p className="text-lg font-serif text-neutral-600 leading-relaxed">
              <span className="font-semibold">When you can't attend,</span>{" "}
              Hyprbot can join meetings on your behalf and capture everything.
            </p>
          </div>
          <div className="flex-1 flex items-end justify-center px-8 pb-0 bg-stone-50/30">
            <MockWindow>
              <div className="grid grid-cols-2 gap-3 p-4 pb-0 bg-neutral-900 h-[300px]">
                <div className="aspect-video bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                  Sarah M.
                </div>
                <div className="aspect-video bg-linear-to-br from-stone-700 to-stone-800 rounded-lg flex flex-col items-center justify-center text-white border-2 border-stone-600">
                  <Icon icon="mdi:robot" className="text-2xl mb-1" />
                  <span className="text-xs font-medium">Hyprbot</span>
                </div>
                <div className="aspect-video bg-linear-to-br from-purple-500 to-purple-600 rounded-t-lg flex items-center justify-center text-white text-sm font-medium">
                  Ben K.
                </div>
                <div className="aspect-video bg-linear-to-br from-green-500 to-green-600 rounded-t-lg flex items-center justify-center text-white text-sm font-medium">
                  Alice R.
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
              <span className="font-semibold">When you attend meetings,</span>{" "}
              Hyprnote runs locally on your device and transcribes everything in real-time.
            </p>
          </div>
          <div className="px-6 pb-0 bg-stone-50/30 overflow-clip">
            <MockWindow variant="mobile">
              <div className="grid grid-cols-2 gap-3 p-3">
                <div className="bg-stone-50 rounded-lg p-3 border border-neutral-200 space-y-1.5">
                  <div className="text-[10px] font-mono text-neutral-500">Notes</div>
                  <div className="space-y-1 text-[10px] text-neutral-700">
                    <div>ui update - mobile</div>
                    <div>api</div>
                    <div className="mt-1">new dash - urgent</div>
                  </div>
                </div>
                <div className="bg-stone-50 rounded-lg p-3 border border-neutral-200 space-y-1.5">
                  <div className="text-[10px] font-mono text-neutral-500">Summary</div>
                  <div className="space-y-1.5 text-[10px] text-neutral-700">
                    <div className="font-semibold">Mobile UI Update</div>
                    <div className="text-[9px] leading-tight">Sarah presented new UI...</div>
                  </div>
                </div>
              </div>
            </MockWindow>
          </div>
        </div>
        <div>
          <div className="p-6 pb-2">
            <p className="text-base font-serif text-neutral-600 leading-relaxed mb-4">
              <span className="font-semibold">When you can't attend,</span>{" "}
              Hyprbot can join meetings on your behalf and capture everything.
            </p>
          </div>
          <div className="px-6 pb-0 bg-stone-50/30 overflow-clip">
            <MockWindow variant="mobile">
              <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-900">
                <div className="aspect-video bg-linear-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-xs font-medium">
                  Sarah M.
                </div>
                <div className="aspect-video bg-linear-to-br from-purple-500 to-purple-600 rounded flex items-center justify-center text-white text-xs font-medium">
                  Ben K.
                </div>
                <div className="aspect-video bg-linear-to-br from-green-500 to-green-600 rounded flex items-center justify-center text-white text-xs font-medium">
                  Alice R.
                </div>
                <div className="aspect-video bg-linear-to-br from-stone-700 to-stone-800 rounded flex flex-col items-center justify-center text-white border-2 border-stone-600">
                  <Icon icon="mdi:robot" className="text-lg" />
                  <span className="text-[9px] font-medium">Hyprbot</span>
                </div>
              </div>
            </MockWindow>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConsentSection() {
  return (
    <section className="py-16 px-4 laptop:px-0">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
            Consent management
          </h2>
          <p className="text-lg text-neutral-600 leading-relaxed">
            We deeply care about consent and give you smart ways to manage it across your organization.
          </p>
        </div>

        <div className="space-y-4">
          <ConsentFeature
            icon="mdi:microphone-settings"
            title="Voice Lock During Meetings"
            description="Attendees can verbally grant or revoke consent during live sessions. Natural and non-intrusive."
          />
          <ConsentFeature
            icon="mdi:link-variant"
            title="Pre-Consent Links"
            description="Send consent links before meetings. Attendees can review and agree to recording before joining."
          />
          <ConsentFeature
            icon="mdi:checkbox-marked-circle"
            title="Meeting Join Consent"
            description="Require explicit consent when joining a meeting. No surprises, full transparency."
          />
          <ConsentFeature
            icon="mdi:shield-account"
            title="Admin Controls"
            description="Manage consent policies across your organization while respecting individual preferences."
          />
        </div>
      </div>
    </section>
  );
}

function ConsentFeature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-6 border border-neutral-200 rounded-lg bg-white">
      <div className="shrink-0">
        <Icon icon={icon} className="text-2xl text-stone-600" />
      </div>
      <div>
        <h3 className="text-lg font-medium text-stone-600 mb-1">{title}</h3>
        <p className="text-sm text-neutral-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ComplianceSection() {
  return (
    <section className="py-16 px-4 laptop:px-0 bg-stone-50 border-y border-neutral-100">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-6">
          Compliance & Security
        </h2>
        <p className="text-lg text-neutral-600 mb-8">
          We're actively working towards industry-standard certifications to meet your regulatory requirements.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Icon icon="mdi:progress-clock" className="text-xl text-yellow-700" />
          <span className="text-sm text-yellow-800 font-medium">SOC 2 Type II - In Progress</span>
        </div>
        <p className="text-sm text-neutral-500 mt-6">
          Additional compliance certifications available based on your needs (HIPAA, GDPR, ISO 27001)
        </p>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 px-4 laptop:px-0">
      <div className="flex flex-col gap-8 items-center text-center max-w-3xl mx-auto">
        <div className="mb-4 size-32 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[40px] bg-transparent">
          <Image
            src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/icon.png"
            alt="Hyprnote"
            width={112}
            height={112}
            className="size-28 rounded-4xl border border-neutral-100"
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl sm:text-4xl font-serif text-stone-600">
            Let's talk about your needs
          </h2>
          <p className="text-lg text-neutral-600 leading-relaxed">
            Every organization is different. Let's discuss how we can adapt Hyprnote to work for you.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link
            to="/founders"
            className={cn([
              "px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "hover:scale-105 active:scale-95 transition-transform shadow-md hover:shadow-lg",
            ])}
          >
            Schedule a Call
          </Link>
        </div>
      </div>
    </section>
  );
}
