import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@hypr/ui/components/ui/button";
import { ChevronLeft, Users, Building, Factory, Building2, Smartphone, UserPlus, Search } from "lucide-react";
import { useState } from "react";

interface AboutViewProps {
  onSubmit: (orgSize: string, howDidYouHear: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

const ORG_SIZE_OPTIONS = [
  { value: '0-10', label: '0-10', icon: Users },
  { value: '10-50', label: '10-50', icon: Building },
  { value: '50-100', label: '50-100', icon: Factory },
  { value: '100+', label: '100+', icon: Building2 },
];

const HOW_HEARD_OPTIONS = [
  { value: 'social-media', label: 'Social Media', icon: Smartphone },
  { value: 'friend', label: 'Through a Friend', icon: UserPlus },
  { value: 'other', label: 'Other', icon: Search },
];

export const AboutView: React.FC<AboutViewProps> = ({ onSubmit, onSkip, onBack }) => {
  const { t } = useLingui();
  const [orgSize, setOrgSize] = useState<string>('');
  const [howDidYouHear, setHowDidYouHear] = useState<string>('');

  const canSubmit = orgSize && howDidYouHear;

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(orgSize, howDidYouHear);
    }
  };

  return (
    <div className="flex flex-col items-center w-full relative">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="absolute top-0 left-0 h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <h2 className="mb-4 text-center text-xl font-semibold text-neutral-800">
        <Trans>Help us tailor your Hyprnote experience</Trans>
      </h2>

      {/* Specific Question */}
      <h2 className="mb-6 text-center text-base font-medium text-neutral-600">
        <Trans>Tell us about your organization</Trans>
      </h2>

      {/* Organization Size */}
      <div className="w-full mb-5">
        <h3 className="text-base font-medium mb-3 text-center">
          <Trans>Organization Size</Trans>
        </h3>
        <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
          {ORG_SIZE_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            return (
              <Button
                key={option.value}
                onClick={() => setOrgSize(option.value)}
                variant={orgSize === option.value ? "default" : "outline"}
                className="h-14 flex flex-col items-center justify-center gap-1"
              >
                <IconComponent className="h-4 w-4" />
                <span className="text-xs font-medium">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* How did you hear */}
      <div className="w-full mb-5">
        <h3 className="text-base font-medium mb-3 text-center">
          <Trans>How did you hear about Hyprnote?</Trans>
        </h3>
        <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
          {HOW_HEARD_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            return (
              <Button
                key={option.value}
                onClick={() => setHowDidYouHear(option.value)}
                variant={howDidYouHear === option.value ? "default" : "outline"}
                className="h-12 flex items-center justify-center gap-3"
              >
                <IconComponent className="h-4 w-4" />
                <span className="text-xs font-medium">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 w-full max-w-sm">
        <PushableButton
          onClick={onSkip}
          className="flex-1"
        >
          <Trans>Skip</Trans>
        </PushableButton>
        
        <PushableButton
          onClick={handleSubmit}
          className="flex-1"
          disabled={!canSubmit}
        >
          <Trans>Continue</Trans>
        </PushableButton>
      </div>
    </div>
  );
};
