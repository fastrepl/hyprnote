import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";
import { Crown, GraduationCap, TrendingUp, Users } from "lucide-react";

interface RoleViewProps {
  onSelect: (role: string) => void;
  onSkip: () => void;
  selectedRole?: string;
}

const ROLE_OPTIONS = [
  { value: "executive-founder", label: "Executive/Founder", icon: Crown },
  { value: "manager-team-lead", label: "Manager/Team Lead", icon: Users },
  { value: "junior", label: "Junior", icon: TrendingUp },
  { value: "intern", label: "Intern", icon: GraduationCap },
];

export const RoleView: React.FC<RoleViewProps> = ({ onSelect, onSkip, selectedRole }) => {
  return (
    <div className="flex flex-col items-center w-full">
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
          const isSelected = selectedRole === option.value;

          return (
            <Button
              key={option.value}
              onClick={() => onSelect(option.value)}
              variant="outline"
              className={cn(
                "h-20 flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-all",
                isSelected && "bg-black text-white hover:bg-black hover:text-white",
              )}
            >
              <IconComponent className="h-6 w-6" />
              <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
