import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";

const ORG_REPO = "fastrepl/hyprnote";

// Curated list of profiles to display
const CURATED_PROFILES = [
  // TODO: Add your curated list of avatar URLs here
  "https://avatars.githubusercontent.com/u/61503739?v=4",
  "https://avatars.githubusercontent.com/u/105270342?v=4",
  "https://avatars.githubusercontent.com/u/30039641?v=4",
  "https://avatars.githubusercontent.com/u/63365510?v=4",
  "https://avatars.githubusercontent.com/u/97124713?v=4",
  "https://avatars.githubusercontent.com/u/59800?v=4",
  "https://avatars.githubusercontent.com/u/51254761?v=4",
  "https://avatars.githubusercontent.com/u/76832007?v=4",
  "https://avatars.githubusercontent.com/u/86834898?v=4",
  "https://avatars.githubusercontent.com/u/48201223?v=4",
  "https://avatars.githubusercontent.com/u/26774729?v=4",
  "https://avatars.githubusercontent.com/u/23347263?v=4",
];

function ProfileGrid({ profiles, cols }: { profiles: string[]; cols: 2 | 3 }) {
  const count = cols === 2 ? 4 : 6;
  return (
    <div className={`grid grid-cols-${cols} gap-3`}>
      {profiles.slice(0, count).map((avatar, idx) => (
        <div
          key={`profile-${idx}`}
          className="size-10 rounded-sm overflow-hidden border-2 border-neutral-200 bg-neutral-100"
        >
          <img
            src={avatar}
            alt="Contributor"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function StatBadge({
  type,
  count,
}: {
  type: "stars" | "forks";
  count: number;
}) {
  const renderCount = (n: number) => n > 1000 ? `${(n / 1000).toFixed(1)}k` : n;

  return (
    <div className="flex flex-col gap-2 h-24 items-center justify-center border border-neutral-200 rounded-sm px-4 bg-neutral-100">
      <p className="font-semibold text-stone-600 font-serif">
        {type === "stars" ? "Stars" : "Forks"}
      </p>
      <p className="text-sm font-medium text-stone-600 text-center">
        {renderCount(count)}
      </p>
    </div>
  );
}

export function GitHubOpenSource() {
  const STARS_COUNT = 6419;
  const FORKS_COUNT = 396;

  return (
    <section className="border-t border-neutral-100">
      <div className="py-16 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
          {/* Column 1: 2x2 grid + Stars badge + 3x2 grid */}
          <div className="flex items-center gap-4 justify-center">
            <ProfileGrid profiles={CURATED_PROFILES.slice(0, 4)} cols={2} />
            <StatBadge type="stars" count={STARS_COUNT} />
            <ProfileGrid profiles={CURATED_PROFILES.slice(4, 10)} cols={3} />
          </div>

          {/* Column 2: Text content */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-serif text-stone-600">Open source</h2>
            <p className="text-lg text-neutral-600">
              Hyprnote was built to be transparent from day one.
            </p>
            <a
              href={`https://github.com/${ORG_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn([
                "inline-flex items-center gap-2 px-6 py-3 mt-4",
                "bg-neutral-800 hover:bg-neutral-700 text-white rounded-sm",
                "transition-all hover:scale-[102%] active:scale-[98%]",
              ])}
            >
              <Icon icon="mdi:github" className="text-xl" />
              <span>View on GitHub</span>
            </a>
          </div>

          {/* Column 3: 2x2 grid + Forks badge + 3x2 grid */}
          <div className="flex items-center gap-4 justify-center">
            <ProfileGrid profiles={CURATED_PROFILES.slice(4, 10)} cols={3} />
            <StatBadge type="forks" count={FORKS_COUNT} />
            <ProfileGrid profiles={CURATED_PROFILES.slice(0, 4)} cols={2} />
          </div>
        </div>
      </div>
    </section>
  );
}
