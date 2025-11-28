import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/product/self-hosting")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Self-Hosting - Hyprnote" },
      {
        name: "description",
        content:
          "Deploy Hyprnote on your own infrastructure. Complete control over your meeting data with on-premises deployment, air-gapped environments, and full data sovereignty.",
      },
      { property: "og:title", content: "Self-Hosting - Hyprnote" },
      {
        property: "og:description",
        content:
          "Run Hyprnote entirely on your own servers. Enterprise-grade meeting transcription with complete infrastructure control, compliance-ready deployment, and zero external dependencies.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/product/self-hosting",
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
          <header className="mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Run Hyprnote on
              <br />
              your infrastructure
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Deploy Hyprnote entirely on your own servers. Complete control
              over your meeting data with on-premises deployment, air-gapped
              environments, and full data sovereignty.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Why self-host
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:server-security"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  Complete data sovereignty
                </h3>
                <p className="text-neutral-600">
                  Your meeting recordings, transcripts, and AI-generated
                  summaries stay within your network perimeter. No data ever
                  leaves your infrastructure.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:shield-check"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  Compliance ready
                </h3>
                <p className="text-neutral-600">
                  Meet HIPAA, GDPR, SOC 2, and other regulatory requirements
                  with on-premises deployment. Simplify audits with complete
                  infrastructure control.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:lan" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  Air-gapped deployment
                </h3>
                <p className="text-neutral-600">
                  Run Hyprnote in completely isolated environments with zero
                  internet connectivity. Perfect for defense, government, and
                  high-security organizations.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:tune-vertical"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  Full customization
                </h3>
                <p className="text-neutral-600">
                  Modify any component to fit your workflow. Integrate with
                  internal systems, customize AI models, and adapt the interface
                  to your needs.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Self-hosted vs. Cloud
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    icon="mdi:cloud"
                    className="text-2xl text-neutral-400"
                  />
                  <h3 className="font-serif text-lg text-neutral-700">
                    Cloud-hosted Solutions
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Data stored on vendor servers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Limited compliance control</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Vendor lock-in risks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Internet dependency</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Third-party data access risks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Limited customization options</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="mdi:server" className="text-2xl text-green-600" />
                  <h3 className="font-serif text-lg text-green-900">
                    Hyprnote Self-hosted
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-green-900">
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Data stays on your servers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Full compliance control</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>No vendor dependencies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Works completely offline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Zero external data access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Fully customizable codebase</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Deployment options
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:docker"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Docker containers
                </h3>
                <p className="text-sm text-neutral-600">
                  Deploy with Docker Compose for quick setup. Ideal for teams
                  wanting containerized infrastructure.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:kubernetes"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">Kubernetes</h3>
                <p className="text-sm text-neutral-600">
                  Scale across clusters with Helm charts. Built for enterprise
                  orchestration and high availability.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:server"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">Bare metal</h3>
                <p className="text-sm text-neutral-600">
                  Install directly on your servers for maximum performance and
                  complete hardware control.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:cloud-lock"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Private cloud
                </h3>
                <p className="text-sm text-neutral-600">
                  Deploy on AWS, GCP, or Azure within your VPC. Your cloud, your
                  rules, your data.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:lan-disconnect"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">Air-gapped</h3>
                <p className="text-sm text-neutral-600">
                  Fully isolated deployment with no network connectivity. All
                  dependencies bundled offline.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:office-building"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">On-premises</h3>
                <p className="text-sm text-neutral-600">
                  Run in your own data center with dedicated hardware. Maximum
                  security and performance.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              What you can self-host
            </h2>
            <div className="space-y-6">
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <div className="flex items-start gap-4 mb-4">
                  <Icon
                    icon="mdi:microphone"
                    className="text-3xl text-stone-600 shrink-0"
                  />
                  <div>
                    <h3 className="text-xl font-serif text-stone-600 mb-2">
                      Transcription server
                    </h3>
                    <p className="text-neutral-600">
                      Run Whisper models on your own GPU servers. Process
                      unlimited audio without external API calls. Supports
                      multiple model sizes from tiny to large-turbo.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <div className="flex items-start gap-4 mb-4">
                  <Icon
                    icon="mdi:brain"
                    className="text-3xl text-stone-600 shrink-0"
                  />
                  <div>
                    <h3 className="text-xl font-serif text-stone-600 mb-2">
                      LLM inference
                    </h3>
                    <p className="text-neutral-600">
                      Deploy HyperLLM or bring your own models. Run
                      summarization, extraction, and analysis entirely within
                      your network. Compatible with Ollama and vLLM.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <div className="flex items-start gap-4 mb-4">
                  <Icon
                    icon="mdi:database"
                    className="text-3xl text-stone-600 shrink-0"
                  />
                  <div>
                    <h3 className="text-xl font-serif text-stone-600 mb-2">
                      Data storage
                    </h3>
                    <p className="text-neutral-600">
                      Store all meeting data in your own database. SQLite for
                      single-node, PostgreSQL for distributed deployments. Full
                      backup and migration control.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Built for enterprise
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Icon
                  icon="mdi:shield-check"
                  className="text-3xl text-green-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    HIPAA & SOC 2 ready
                  </h3>
                  <p className="text-neutral-600">
                    Self-hosting simplifies compliance by keeping all data
                    within your controlled environment. No third-party
                    processors to audit.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon
                  icon="mdi:account-group"
                  className="text-3xl text-blue-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    SSO & LDAP integration
                  </h3>
                  <p className="text-neutral-600">
                    Connect to your existing identity provider. Support for
                    SAML, OIDC, and Active Directory out of the box.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon
                  icon="mdi:chart-line"
                  className="text-3xl text-purple-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    Usage analytics
                  </h3>
                  <p className="text-neutral-600">
                    Monitor adoption and usage across your organization with
                    built-in analytics. All data stays internal.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon
                  icon="mdi:headset"
                  className="text-3xl text-orange-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    Dedicated support
                  </h3>
                  <p className="text-neutral-600">
                    Enterprise customers get priority support, deployment
                    assistance, and custom development options.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Open source foundation
            </h2>
            <div className="p-8 border border-neutral-200 rounded-lg bg-white">
              <div className="flex items-start gap-4">
                <Icon
                  icon="mdi:github"
                  className="text-4xl text-stone-600 shrink-0"
                />
                <div>
                  <h3 className="text-xl font-serif text-stone-600 mb-3">
                    Fully auditable codebase
                  </h3>
                  <p className="text-neutral-600 mb-4">
                    Hyprnote is open source under GPL-3.0. Inspect every line of
                    code, verify security practices, and customize to your
                    needs. No black boxes, no hidden data collection.
                  </p>
                  <a
                    href="https://github.com/fastrepl/hyprnote"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 font-medium"
                  >
                    <Icon icon="mdi:github" className="text-xl" />
                    View on GitHub
                    <Icon icon="mdi:arrow-right" className="text-lg" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Ready to self-host?
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Get enterprise-grade meeting transcription on your own
              infrastructure. Contact us for deployment assistance and custom
              solutions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://hyprnote.com/founders"
                className={cn([
                  "px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                Contact sales
              </a>
              <Link
                to="/product/local-ai"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-stone-50 transition-colors",
                ])}
              >
                Learn about Local AI
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
