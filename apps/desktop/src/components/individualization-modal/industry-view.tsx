import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { Scale, Briefcase, Rocket, Landmark, Laptop, Hospital } from "lucide-react";

interface IndustryViewProps {
  onSelect: (industry: string) => void;
  onSkip: () => void;
}

const INDUSTRY_OPTIONS = [
  { value: 'legal', label: 'Legal', icon: Scale },
  { value: 'finance', label: 'Finance/Consulting', icon: Briefcase },
  { value: 'startup', label: 'Startup', icon: Rocket },
  { value: 'government', label: 'Government', icon: Landmark },
  { value: 'technology', label: 'Technology', icon: Laptop },
  { value: 'healthcare', label: 'Healthcare', icon: Hospital },
];

export const IndustryView: React.FC<IndustryViewProps> = ({ onSelect, onSkip }) => {
  const { t } = useLingui();

  return (
    <div className="flex flex-col items-center w-full">
      {/* Main Title */}
      <h2 className="mb-4 text-center text-xl font-semibold text-neutral-800">
        <Trans>Help us tailor your Hyprnote experience</Trans>
      </h2>

      {/* Specific Question */}
      <h2 className="mb-8 text-center text-base font-medium text-neutral-600">
        <Trans>What industry are you in?</Trans>
      </h2>

      <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
        {INDUSTRY_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          return (
            <Button
              key={option.value}
              onClick={() => onSelect(option.value)}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-all"
            >
              <IconComponent className="h-6 w-6" />
              <span className="text-xs font-medium text-center">{option.label}</span>
            </Button>
          );
        })}
      </div>

      <PushableButton
        onClick={onSkip}
        className="w-full max-w-xs"
      >
        <Trans>Skip</Trans>
      </PushableButton>
    </div>
  );
};
