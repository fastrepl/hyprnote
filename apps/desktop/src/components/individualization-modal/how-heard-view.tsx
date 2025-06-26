import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@hypr/ui/components/ui/button";
import { UserPlus, Search, Globe, Linkedin, Twitter, MessageSquare } from "lucide-react";

interface HowHeardViewProps {
  onSelect: (howHeard: string) => void;
  onSkip: () => void;
}

const HOW_HEARD_OPTIONS = [
  { value: 'friend', label: 'Through a Friend', icon: UserPlus },
  { value: 'reddit', label: 'Reddit', icon: MessageSquare },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'blog-linkedin', label: 'Blog/LinkedIn', icon: Linkedin },
  { value: 'search', label: 'Search Engine', icon: Search },
  { value: 'other', label: 'Other', icon: Globe },
];

export const HowHeardView: React.FC<HowHeardViewProps> = ({ onSelect, onSkip }) => {
  const { t } = useLingui();

  return (
    <div className="flex flex-col items-center w-full">
      {/* Main Title */}
      <h2 className="mb-4 text-center text-xl font-semibold text-neutral-800">
        <Trans>Help us tailor your Hyprnote experience</Trans>
      </h2>

      {/* Specific Question */}
      <h2 className="mb-8 text-center text-base font-medium text-neutral-600">
        <Trans>How did you hear about Hyprnote?</Trans>
      </h2>

      <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-6">
        {HOW_HEARD_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          return (
            <Button
              key={option.value}
              onClick={() => onSelect(option.value)}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-all"
            >
              <IconComponent className="h-5 w-5" />
              <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
            </Button>
          );
        })}
      </div>

    </div>
  );
};
