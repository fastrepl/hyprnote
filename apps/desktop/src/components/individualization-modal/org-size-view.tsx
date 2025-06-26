import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@hypr/ui/components/ui/button";
import { Users, Building, Factory, Building2 } from "lucide-react";

interface OrgSizeViewProps {
  onSelect: (orgSize: string) => void;
  onSkip: () => void;
}

const ORG_SIZE_OPTIONS = [
  { value: '0-10', label: '0-10', icon: Users },
  { value: '10-100', label: '10-100', icon: Building },
  { value: '100-1000', label: '100-1000', icon: Factory },
  { value: '1000+', label: '1000+', icon: Building2 },
];

export const OrgSizeView: React.FC<OrgSizeViewProps> = ({ onSelect, onSkip }) => {
  const { t } = useLingui();

  return (
    <div className="flex flex-col items-center w-full">
      {/* Main Title */}
      <h2 className="mb-4 text-center text-xl font-semibold text-neutral-800">
        <Trans>Help us tailor your Hyprnote experience</Trans>
      </h2>

      {/* Specific Question */}
      <h2 className="mb-8 text-center text-base font-medium text-neutral-600">
        <Trans>What's your organization size?</Trans>
      </h2>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
        {ORG_SIZE_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          return (
            <Button
              key={option.value}
              onClick={() => onSelect(option.value)}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-all"
            >
              <IconComponent className="h-6 w-6" />
              <span className="text-sm font-medium text-center">{option.label}</span>
            </Button>
          );
        })}
      </div>

    </div>
  );
};
