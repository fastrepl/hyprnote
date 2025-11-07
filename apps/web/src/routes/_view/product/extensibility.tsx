import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/extensibility")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Integrations & API - Hyprnote" },
      {
        name: "description",
        content:
          "Connect Hyprnote with your favorite tools and build custom integrations with our API. Integrations and developer API coming soon.",
      },
    ],
  }),
});

function Component() {
  const integrations = [
    { name: "Slack", icon: "mdi:slack", description: "Share meeting notes to Slack channels" },
    { name: "Notion", icon: "simple-icons:notion", description: "Sync notes to your Notion workspace" },
    { name: "Google Calendar", icon: "mdi:google", description: "Auto-attach notes to calendar events" },
    { name: "Linear", icon: "simple-icons:linear", description: "Create issues from action items" },
    { name: "Jira", icon: "mdi:jira", description: "Sync tasks with Jira tickets" },
    { name: "Asana", icon: "simple-icons:asana", description: "Create tasks in Asana projects" },
    { name: "Trello", icon: "mdi:trello", description: "Add cards to Trello boards" },
    { name: "Microsoft Teams", icon: "mdi:microsoft-teams", description: "Share notes in Teams channels" },
    { name: "Salesforce", icon: "mdi:salesforce", description: "Log calls and notes to Salesforce" },
    { name: "HubSpot", icon: "simple-icons:hubspot", description: "Sync meeting notes to HubSpot CRM" },
    { name: "Zoom", icon: "mdi:video", description: "Auto-record Zoom meetings" },
    { name: "Google Meet", icon: "mdi:google-meet", description: "Join and record Google Meet calls" },
  ];

  const apiFeatures = [
    {
      icon: "mdi:code-json",
      title: "RESTful API",
      description: "Simple, REST-based API for easy integration",
    },
    {
      icon: "mdi:key",
      title: "API Keys",
      description: "Secure authentication with API keys",
    },
    {
      icon: "mdi:webhook",
      title: "Webhooks",
      description: "Real-time notifications for events",
    },
    {
      icon: "mdi:file-document",
      title: "Documentation",
      description: "Comprehensive guides and examples",
    },
    {
      icon: "mdi:code-braces",
      title: "SDK Libraries",
      description: "Official SDKs for popular languages",
    },
    {
      icon: "mdi:shield-check",
      title: "Rate Limits",
      description: "Fair usage policies with generous limits",
    },
  ];

  const useCases = [
    {
      title: "Custom Workflows",
      description: "Build automated workflows that integrate with your existing tools",
      icon: "mdi:workflow",
    },
    {
      title: "Data Analysis",
      description: "Extract meeting data for analytics and reporting",
      icon: "mdi:chart-bar",
    },
    {
      title: "Internal Tools",
      description: "Create custom internal apps powered by Hyprnote",
      icon: "mdi:tools",
    },
    {
      title: "AI Applications",
      description: "Build AI-powered features using meeting transcripts",
      icon: "mdi:robot",
    },
  ];

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-16 text-center">
            <div className="inline-block px-4 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-full mb-6">
              Coming Soon
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Extend Hyprnote with
              <br />
              workflows, integrations & API
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
              Automate your workflow with built-in automation, connect with your favorite tools through integrations, or
              build custom solutions with our developer API. Coming soon.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Workflow automation</h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-3xl mx-auto">
              Automate repetitive tasks with powerful workflows. No coding required.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <Icon icon="mdi:auto-fix" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Auto-process meetings</h3>
                <p className="text-neutral-600 mb-4">
                  Automatically transcribe, summarize, and extract action items from all your meetings without manual
                  intervention.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Trigger workflows on meeting end</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Apply custom templates automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Tag and categorize by meeting type</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <Icon icon="mdi:bell-ring" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Smart notifications</h3>
                <p className="text-neutral-600 mb-4">
                  Get notified when important events happen in your meetings. Set up custom alerts based on keywords,
                  speakers, or topics.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Alert on specific keywords mentioned</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Notify on action items assigned to you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Daily/weekly digest summaries</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:file-export" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Auto-export</h3>
                <p className="text-sm text-neutral-600">
                  Automatically export notes to specific folders or formats after each meeting.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:email-send" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Email summaries</h3>
                <p className="text-sm text-neutral-600">
                  Send meeting summaries to participants or stakeholders automatically.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:calendar-sync" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Calendar sync</h3>
                <p className="text-sm text-neutral-600">
                  Attach notes to calendar events and sync action items as tasks.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Built-in integrations</h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-3xl mx-auto">
              Connect Hyprnote with the tools you use every day. No coding required.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => (
                <div
                  key={integration.name}
                  className="p-6 border border-neutral-200 rounded-lg bg-white hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center">
                      <Icon icon={integration.icon} className="text-2xl text-stone-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-lg text-stone-600 mb-1">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-neutral-600">{integration.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Developer API
            </h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-2xl mx-auto">
              Build custom integrations, automate workflows, and create powerful applications on top of Hyprnote.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {apiFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 border border-neutral-200 rounded-lg bg-white hover:shadow-md transition-all"
                >
                  <Icon icon={feature.icon} className="text-3xl text-stone-600 mb-4" />
                  <h3 className="font-serif text-lg text-stone-600 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-neutral-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              What you can build with the API
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {useCases.map((useCase) => (
                <div
                  key={useCase.title}
                  className="flex items-start gap-4 p-6 border border-neutral-200 rounded-lg bg-white"
                >
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center">
                    <Icon icon={useCase.icon} className="text-2xl text-stone-600" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-stone-600 mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-sm text-neutral-600">{useCase.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">API preview</h2>
            <div className="bg-neutral-900 rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm text-neutral-100 font-mono">
                <code>{`// Example: Fetch recent meetings
const response = await fetch('https://api.hyprnote.com/v1/meetings', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const meetings = await response.json();

// Example: Get meeting transcript
const meeting = await fetch(
  'https://api.hyprnote.com/v1/meetings/abc123',
  {
    headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
  }
).then(r => r.json());

console.log(meeting.transcript);
console.log(meeting.summary);
console.log(meeting.action_items);`}</code>
              </pre>
            </div>
            <p className="text-center text-sm text-neutral-500 mt-4">
              API design subject to change
            </p>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
              Request an integration or API access
            </h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-2xl mx-auto">
              We're actively developing integrations and our API. Share your use case and we'll reach out when we
              launch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@hyprnote.com?subject=Integration Request"
                className={cn([
                  "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                <Icon icon="mdi:puzzle" />
                <span>Request integration</span>
              </a>
              <a
                href="mailto:support@hyprnote.com?subject=API Access Request"
                className={cn([
                  "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-white transition-colors",
                ])}
              >
                <Icon icon="mdi:code-tags" />
                <span>Request API access</span>
              </a>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Get notified when we launch
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Be the first to know when integrations and API become available.
            </p>
            <a
              href="/join-waitlist"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Join waitlist
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
