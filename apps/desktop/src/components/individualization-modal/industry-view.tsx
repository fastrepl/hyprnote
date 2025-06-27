import { Trans } from "@lingui/react/macro";
import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/ui/lib/utils";
import { Briefcase, Users, Hospital, Landmark, Rocket, GraduationCap, EyeOff, Edit3, Check } from "lucide-react";
import { useState, useEffect } from "react";

interface IndustryViewProps {
  onSelect: (industry: string) => void;
  onSkip: () => void;
  selectedIndustry?: string;
}

const INDUSTRY_OPTIONS = [
  { value: 'finance', label: 'Finance', icon: Briefcase },
  { value: 'consulting', label: 'Consulting', icon: Users },
  { value: 'startup-tech', label: 'Startup/Tech', icon: Rocket },
  { value: 'healthcare', label: 'Healthcare', icon: Hospital },
  { value: 'government', label: 'Government', icon: Landmark },
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'other', label: 'Other', icon: Edit3 },
  { value: 'prefer-not-to-say', label: 'Prefer not to say', icon: EyeOff },
];

export const IndustryView: React.FC<IndustryViewProps> = ({ onSelect, onSkip, selectedIndustry }) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customIndustry, setCustomIndustry] = useState('');

  const isOtherSelected = selectedIndustry?.startsWith('other:');

  useEffect(() => {
    if (isOtherSelected) {
      setShowCustomInput(true);
      setCustomIndustry(selectedIndustry?.replace('other: ', '') || '');
    }
  }, [selectedIndustry, isOtherSelected]);

  const handleOptionClick = (value: string) => {
    if (value === 'other') {
      setShowCustomInput(true);
    } else {
      onSelect(value);
    }
  };

  const handleCustomSubmit = () => {
    if (customIndustry.trim()) {
      onSelect(`other: ${customIndustry.trim()}`);
    }
  };

  const handleCustomInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Main Title */}
      <h2 className="mb-4 text-center text-xl font-semibold text-neutral-800">
        <Trans>Help us tailor your Hyprnote experience</Trans>
      </h2>

      {/* Specific Question */}
      <h2 className="mb-8 text-center text-base font-medium text-neutral-600">
        <Trans>What industry are you in?</Trans>
      </h2>

      {/* Industry Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mb-6">
        {INDUSTRY_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isOther = option.value === 'other';
          const isSelected = selectedIndustry === option.value || (isOther && isOtherSelected);
          
          return (
            <Button
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              variant="outline"
              className={cn(
                "h-20 flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-all",
                isSelected && "bg-black text-white hover:bg-black hover:text-white",
                showCustomInput && isOther && "ring-2 ring-blue-500 bg-blue-50"
              )}
              disabled={showCustomInput && !isOther}
            >
              <IconComponent className="h-5 w-5" />
              <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Custom Input Section - Smooth Expansion */}
      {showCustomInput && (
        <div className="w-full max-w-md mb-6 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type your industry..."
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
                onKeyPress={handleCustomInputKeyPress}
                className="flex-1"
                autoFocus
              />
              <Button
                onClick={handleCustomSubmit}
                disabled={!customIndustry.trim()}
                size="sm"
                className="px-3"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => {
                setShowCustomInput(false);
                setCustomIndustry('');
              }}
              variant="ghost"
              size="sm"
              className="w-full text-xs text-neutral-500 hover:text-neutral-700"
            >
              <Trans>Cancel</Trans>
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};
