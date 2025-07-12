import { Trans, useLingui } from "@lingui/react/macro";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { cn } from "@hypr/ui/lib/utils";

import { createCannyClient } from "@/lib/canny";

type FeedbackType = "idea" | "small-bug" | "urgent-bug";

export default function Feedback() {
  const { t } = useLingui();

  const feedbackTypes: { type: FeedbackType; label: string; description: string }[] = [
    { type: "idea", label: t`💡 Idea`, description: t`Ooh! Suggestion!` },
    { type: "small-bug", label: t`🐛 Small Bug`, description: t`Hmm... this is off...` },
    { type: "urgent-bug", label: t`🚨 Urgent Bug`, description: t`Ugh! Can't use it!` },
  ];

  const [selectedType, setSelectedType] = useState<FeedbackType>("small-bug");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const confirmed = await confirm("Thank you!", { title: "Send Feedback?" });
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const cannyClient = createCannyClient();

      if (!cannyClient) {
        console.warn("Canny not configured, logging feedback locally:");
        console.log({
          type: selectedType,
          description,
          email,
          timestamp: new Date().toISOString(),
        });

        toast.success(t`Feedback recorded locally (Canny not configured)`, { duration: 2000 });
        setDescription("");
        setEmail("");
        return;
      }

      const typeLabels = {
        idea: "Feature Suggestion",
        "small-bug": "Bug Report",
        "urgent-bug": "Urgent Bug Report",
      };

      const baseTitle = `${typeLabels[selectedType]}: ${description.slice(0, 50)}${
        description.length > 50 ? "..." : ""
      }`;
      const title = selectedType === "urgent-bug" ? `[URGENT] ${baseTitle}` : baseTitle;
      const userEmail = email || "anonymous@hyprnote.com";

      const result = await cannyClient.submitFeedback(
        userEmail,
        title,
        description,
        selectedType,
      );

      toast.success(t`Feedback submitted successfully!`, { duration: 2000 });
      console.log("Feedback submitted to Canny:", result);

      setDescription("");
      setEmail("");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error(t`Failed to submit feedback. Please try again.`, { duration: 2000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600">
        <Trans>Help us improve your experience by providing feedback.</Trans>
      </p>

      <div className="grid grid-cols-3 gap-4">
        {feedbackTypes.map(({ type, label, description }) => (
          <Button
            key={type}
            variant="outline"
            className={cn(
              "flex h-auto flex-col items-start justify-between gap-2 p-4 text-left",
              selectedType === type && "border-blue-500 ring-2 ring-blue-500 ring-offset-2",
            )}
            onClick={() => setSelectedType(type)}
          >
            <div className="font-medium">
              {label}
            </div>
            <div className="text-sm text-neutral-600">
              {description}
            </div>
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-description" className="sr-only">
          <Trans>Describe the issue</Trans>
        </Label>
        <Textarea
          id="feedback-description"
          placeholder="Describe the issue..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-40 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-email" className="text-sm font-medium">
          <Trans>Email (Optional)</Trans>
        </Label>
        <Input
          id="feedback-email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <p className="text-xs text-neutral-500">
          <Trans>We'll only use this to follow up if needed.</Trans>
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!description.trim() || isSubmitting}
      >
        {isSubmitting ? <Trans>Submitting...</Trans> : <Trans>Submit Feedback</Trans>}
      </Button>
    </div>
  );
}
