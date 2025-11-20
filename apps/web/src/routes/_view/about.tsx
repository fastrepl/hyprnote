import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, XIcon } from "lucide-react";
import { useState } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { cn } from "@hypr/utils";

import { MockWindow } from "@/components/mock-window";

export const Route = createFileRoute("/_view/about")({
  component: Component,
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
    role: "Chief Wisdom Seeker",
    bio: "I love designing simple and intuitive user interfaces.",
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
    name: "Yujong Lee",
    role: "Chief OSS Lover",
    bio: "I am super bullish about open-source software.",
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

const teamPhotos = [
  {
    id: "john-1",
    name: "john-1.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/john-1.jpg",
  },
  {
    id: "john-2",
    name: "john-2.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/john-2.jpg",
  },
  {
    id: "palo-alto-1",
    name: "palo-alto-1.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/palo-alto-1.jpg",
  },
  {
    id: "palo-alto-2",
    name: "palo-alto-2.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/palo-alto-2.jpg",
  },
  {
    id: "palo-alto-3",
    name: "palo-alto-3.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/palo-alto-3.jpg",
  },
  {
    id: "palo-alto-4",
    name: "palo-alto-4.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/palo-alto-4.jpg",
  },
  {
    id: "sadang",
    name: "sadang.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/sadang.jpg",
  },
  {
    id: "yc-0",
    name: "yc-0.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yc-0.jpg",
  },
  {
    id: "yc-1",
    name: "yc-1.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yc-1.jpg",
  },
  {
    id: "yc-2",
    name: "yc-2.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yc-2.jpg",
  },
  {
    id: "yujong-1",
    name: "yujong-1.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yujong-1.jpg",
  },
  {
    id: "yujong-2",
    name: "yujong-2.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yujong-2.jpg",
  },
  {
    id: "yujong-3",
    name: "yujong-3.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yujong-3.jpg",
  },
  {
    id: "yujong-4",
    name: "yujong-4.jpg",
    url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/team/yujong-4.jpg",
  },
];

type SelectedItem =
  | { type: "story" }
  | { type: "founder"; data: (typeof founders)[0] }
  | { type: "photo"; data: (typeof teamPhotos)[0] };

function Component() {
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <AboutContentSection
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="px-6 py-16 lg:py-24">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          About
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Learn about Hyprnote, meet our team, and discover the story behind our
          privacy-first note-taking platform.
        </p>
      </div>
    </div>
  );
}

function AboutContentSection({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem | null;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <section className="px-6 pb-16 lg:pb-24">
      <div className="max-w-4xl mx-auto">
        <MockWindow title="About" className="rounded-lg w-full max-w-none">
          <div className="h-[480px]">
            {!selectedItem ? (
              <AboutGridView setSelectedItem={setSelectedItem} />
            ) : (
              <AboutDetailView
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
              />
            )}
          </div>

          <AboutStatusBar selectedItem={selectedItem} />
        </MockWindow>
      </div>
    </section>
  );
}

function AboutGridView({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="p-8 overflow-y-auto h-[480px]">
      <OurStoryGrid setSelectedItem={setSelectedItem} />
      <FoundersGrid setSelectedItem={setSelectedItem} />
      <TeamPhotosGrid setSelectedItem={setSelectedItem} />
    </div>
  );
}

function OurStoryGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Our Story
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        <button
          onClick={() => setSelectedItem({ type: "story" })}
          className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
        >
          <div className="mb-3 w-16 h-16 flex items-center justify-center">
            <img
              src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/textedit.webp"
              alt="Our Story"
              width={64}
              height={64}
              className="w-16 h-16 group-hover:scale-110 transition-transform"
            />
          </div>
          <div className="font-medium text-stone-600">Our Story.txt</div>
        </button>
      </div>
    </div>
  );
}

function FoundersGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-8 border-t border-neutral-100 pt-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Founders
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {founders.map((founder) => (
          <button
            key={founder.id}
            onClick={() =>
              setSelectedItem({
                type: "founder",
                data: founder,
              })
            }
            className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
          >
            <div className="mb-3 w-16 h-16">
              <img
                src={founder.image}
                alt={founder.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full border-2 border-neutral-200 object-cover group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="font-medium text-stone-600">{founder.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeamPhotosGrid({
  setSelectedItem,
}: {
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="border-t border-neutral-100 pt-8">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 px-2">
        Team Photos
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 content-start">
        {teamPhotos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedItem({ type: "photo", data: photo })}
            className="group flex flex-col items-center text-center p-4 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer h-fit"
          >
            <div className="mb-3 w-16 h-16">
              <img
                src={photo.url}
                alt={photo.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg border border-neutral-200 object-cover group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="font-medium text-stone-600 text-sm truncate w-full">
              {photo.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AboutDetailView({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-[480px]">
      <AboutSidebar
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
      <ResizableHandle withHandle className="bg-neutral-200" />
      <AboutDetailPanel
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />
    </ResizablePanelGroup>
  );
}

function AboutSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <ResizablePanel defaultSize={35} minSize={25} maxSize={45}>
      <div className="p-4 h-full overflow-y-auto">
        <OurStorySidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
        <FoundersSidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
        <TeamPhotosSidebar
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
        />
      </div>
    </ResizablePanel>
  );
}

function OurStorySidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Our Story
      </div>
      <button
        onClick={() => setSelectedItem({ type: "story" })}
        className={cn([
          "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
          selectedItem?.type === "story"
            ? "border-stone-600 bg-stone-100"
            : "border-neutral-200",
        ])}
      >
        <div className="w-12 h-12 shrink-0 flex items-center justify-center">
          <img
            src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/icons/textedit.webp"
            alt="Our Story"
            width={48}
            height={48}
            className="w-12 h-12"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-600 truncate">
            Our Story.txt
          </p>
        </div>
      </button>
    </div>
  );
}

function FoundersSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Founders
      </div>
      <div className="space-y-3">
        {founders.map((founder) => (
          <button
            key={founder.id}
            onClick={() =>
              setSelectedItem({
                type: "founder",
                data: founder,
              })
            }
            className={cn([
              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
              selectedItem?.type === "founder" &&
              selectedItem.data.id === founder.id
                ? "border-stone-600 bg-stone-100"
                : "border-neutral-200",
            ])}
          >
            <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden border-2 border-neutral-200">
              <img
                src={founder.image}
                alt={founder.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-600 truncate">
                {founder.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {founder.role}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TeamPhotosSidebar({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem) => void;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 px-2">
        Team Photos
      </div>
      <div className="space-y-3">
        {teamPhotos.map((photo) => (
          <button
            key={photo.id}
            onClick={() =>
              setSelectedItem({
                type: "photo",
                data: photo,
              })
            }
            className={cn([
              "w-full bg-stone-50 border rounded-lg p-3 hover:border-stone-400 hover:bg-stone-100 transition-colors text-left flex items-center gap-3 cursor-pointer",
              selectedItem?.type === "photo" &&
              selectedItem.data.id === photo.id
                ? "border-stone-600 bg-stone-100"
                : "border-neutral-200",
            ])}
          >
            <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-neutral-200">
              <img
                src={photo.url}
                alt={photo.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-600 truncate">
                {photo.name}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AboutDetailPanel({
  selectedItem,
  setSelectedItem,
}: {
  selectedItem: SelectedItem;
  setSelectedItem: (item: SelectedItem | null) => void;
}) {
  return (
    <ResizablePanel defaultSize={65}>
      <div className="h-full flex flex-col">
        {selectedItem?.type === "story" && (
          <StoryDetail onClose={() => setSelectedItem(null)} />
        )}
        {selectedItem?.type === "founder" && (
          <FounderDetail
            founder={selectedItem.data}
            onClose={() => setSelectedItem(null)}
          />
        )}
        {selectedItem?.type === "photo" && (
          <PhotoDetail
            photo={selectedItem.data}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </div>
    </ResizablePanel>
  );
}

function StoryDetail({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">Our Story.txt</h2>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="prose prose-stone max-w-none">
          <h2 className="text-3xl font-serif text-stone-600 mb-6">
            Making notetaking effortless
          </h2>
          <p className="text-lg text-neutral-600 leading-relaxed mb-6">
            We believe that capturing and organizing your conversations
            shouldn't be a chore. That's why we built Hyprnote - a tool that
            listens, learns, and helps you remember what matters.
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
                Your conversations are personal. We process everything locally
                on your device using on-device AI, so your data never leaves
                your computer.
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
                Stop worrying about missing important details. Hyprnote captures
                both your mic and system audio, giving you complete context for
                every conversation.
              </p>
            </div>
            <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
              <Icon icon="mdi:brain" className="text-3xl text-stone-600 mb-3" />
              <h4 className="text-lg font-serif text-stone-600 mb-2">
                Intelligent Organization
              </h4>
              <p className="text-sm text-neutral-600">
                AI helps you find what matters. Automatic transcription, smart
                summaries, and searchable notes mean you'll never lose track of
                important information.
              </p>
            </div>
            <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
              <Icon icon="mdi:tools" className="text-3xl text-stone-600 mb-3" />
              <h4 className="text-lg font-serif text-stone-600 mb-2">
                Built for Everyone
              </h4>
              <p className="text-sm text-neutral-600">
                From remote workers to students, from entrepreneurs to
                executives - Hyprnote adapts to your workflow and helps you work
                smarter.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-serif text-stone-600 mb-4 mt-8">
            Our Story
          </h3>
          <p className="text-base text-neutral-600 leading-relaxed mb-4">
            Hyprnote was born from a simple frustration: trying to take notes
            while staying engaged in important conversations. Whether it was a
            crucial client call, a brainstorming session with the team, or an
            online lecture, we found ourselves constantly torn between listening
            and writing.
          </p>
          <p className="text-base text-neutral-600 leading-relaxed mb-4">
            We looked for solutions, but everything required bots joining
            meetings, cloud uploads, or compromising on privacy. We knew there
            had to be a better way.
          </p>
          <p className="text-base text-neutral-600 leading-relaxed mb-6">
            That's when we started building Hyprnote - a desktop application
            that captures audio locally, processes it with on-device AI, and
            gives you the freedom to be fully present in your conversations
            while never missing a detail.
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
                  We will never compromise on privacy. Your data belongs to you,
                  period.
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
                  We're open about how Hyprnote works, from our tech stack to
                  our pricing model.
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
                  We build features our users actually need, guided by your
                  feedback and requests.
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
                  We ship updates regularly and are always working to make
                  Hyprnote better.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-stone-50 border border-neutral-200 rounded-lg p-6 text-center mt-8">
            <h4 className="text-xl font-serif text-stone-600 mb-2">
              Built by Fastrepl
            </h4>
            <p className="text-sm text-neutral-600 mb-4">
              Hyprnote is developed by Fastrepl, a team dedicated to building
              productivity tools that respect your privacy and enhance your
              workflow.
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
    </>
  );
}

function FounderDetail({
  founder,
  onClose,
}: {
  founder: (typeof founders)[0];
  onClose: () => void;
}) {
  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">{founder.name}</h2>
        <div className="flex items-center gap-2">
          <a
            href={founder.image}
            download={`${founder.name.toLowerCase().replace(" ", "-")}.png`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Download Photo
          </a>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="flex justify-center mb-6">
          <img
            src={founder.image}
            alt={founder.name}
            width={200}
            height={200}
            className="w-48 h-48 rounded-full border-4 border-neutral-200 object-cover"
          />
        </div>

        <div>
          <h3 className="text-2xl font-serif text-stone-600 mb-1">
            {founder.name}
          </h3>
          <p className="text-sm text-neutral-500 uppercase tracking-wider mb-4">
            {founder.role}
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed mb-6">
            {founder.bio}
          </p>

          <div className="flex flex-wrap gap-2">
            {founder.links.email && (
              <a
                href={`mailto:${founder.links.email}`}
                className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-3 h-3" />
                <span>Email</span>
              </a>
            )}
            {founder.links.twitter && (
              <a
                href={founder.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                aria-label="Twitter"
              >
                <Icon icon="mdi:twitter" className="text-sm" />
                <span>Twitter</span>
              </a>
            )}
            {founder.links.github && (
              <a
                href={founder.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                aria-label="GitHub"
              >
                <Icon icon="mdi:github" className="text-sm" />
                <span>GitHub</span>
              </a>
            )}
            {founder.links.linkedin && (
              <a
                href={founder.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs border border-neutral-300 text-stone-600 rounded-full hover:bg-stone-50 transition-colors"
                aria-label="LinkedIn"
              >
                <Icon icon="mdi:linkedin" className="text-sm" />
                <span>LinkedIn</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PhotoDetail({
  photo,
  onClose,
}: {
  photo: (typeof teamPhotos)[0];
  onClose: () => void;
}) {
  return (
    <>
      <div className="py-2 px-4 flex items-center justify-between border-b border-neutral-200">
        <h2 className="font-medium text-stone-600">{photo.name}</h2>
        <div className="flex items-center gap-2">
          <a
            href={photo.url}
            download={photo.name}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 h-8 flex items-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        <img
          src={photo.url}
          alt={photo.name}
          className="w-full object-cover mb-6 rounded-lg"
        />

        <p className="text-sm text-neutral-600">
          Team photo from the Hyprnote team.
        </p>
      </div>
    </>
  );
}

function AboutStatusBar({
  selectedItem,
}: {
  selectedItem: SelectedItem | null;
}) {
  const totalItems = 1 + founders.length + teamPhotos.length;

  return (
    <div className="bg-stone-50 border-t border-neutral-200 px-4 py-2">
      <span className="text-xs text-neutral-500">
        {selectedItem
          ? selectedItem.type === "founder"
            ? `Viewing ${selectedItem.data.name}`
            : selectedItem.type === "photo"
              ? `Viewing ${selectedItem.data.name}`
              : "Viewing Our Story"
          : `${totalItems} items, 3 groups`}
      </span>
    </div>
  );
}
