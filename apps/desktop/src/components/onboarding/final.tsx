import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import { commands as sfxCommands } from "@hypr/plugin-sfx";

import { commands } from "../../types/tauri.gen";

const SOCIALS = [
  { label: "Discord", url: "https://discord.gg/CX8gTH2tj9" },
  { label: "GitHub", url: "https://github.com/fastrepl/hyprnote" },
  { label: "X", url: "https://x.com/tryhyprnote" },
] as const;

export function FinalSection({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">
          Join our community and stay updated:
        </p>
        <div className="flex gap-2">
          {SOCIALS.map(({ label, url }) => (
            <button
              key={label}
              onClick={() => void openerCommands.openUrl(url, null)}
              className="px-4 py-2 text-sm rounded-full border border-neutral-200 text-neutral-700 transition-colors duration-150 hover:bg-neutral-50 hover:border-neutral-300"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => void finishOnboarding(onFinish)}
        className="w-full py-3 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white text-sm font-medium duration-150 hover:scale-[1.01] active:scale-[0.99]"
      >
        Get Started
      </button>
    </div>
  );
}

export async function finishOnboarding(onFinish?: () => void) {
  await sfxCommands.stop("BGM").catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await commands.setOnboardingNeeded(false).catch(console.error);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await analyticsCommands.event({ event: "onboarding_completed" });
  onFinish?.();
}
