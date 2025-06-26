import PushableButton from "@hypr/ui/components/ui/pushable-button";
import { TextAnimate } from "@hypr/ui/components/ui/text-animate";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@hypr/ui/components/ui/button";
import { ChevronLeft, UserCheck, TrendingUp, GraduationCap, MoreHorizontal } from "lucide-react";

interface RoleViewProps {
  onSelect: (role: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

const ROLE_OPTIONS = [
  { value: 'managerial', label: 'Managerial Position', icon: UserCheck },
  { value: 'junior', label: 'Junior', icon: TrendingUp },
  { value: 'intern', label: 'Intern', icon: GraduationCap },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];

export const RoleView: React.FC<RoleViewProps> = ({ onSelect, onSkip, onBack }) => {
  const { t } = useLingui();

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

      {/* Main Title */}
      <h2 className="mb-4 text-center text-xl font-semibold text-neutral-800">
        <Trans>Help us tailor your Hyprnote experience</Trans>
      </h2>

      {/* Specific Question */}
      <h2 className="mb-8 text-center text-base font-medium text-neutral-600">
        <Trans>What's your role?</Trans>
      </h2>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
        {ROLE_OPTIONS.map((option) => {
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
