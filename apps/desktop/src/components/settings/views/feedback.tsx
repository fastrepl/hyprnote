import { Trans, useLingui } from "@lingui/react/macro";
import * as Sentry from "@sentry/react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { Textarea } from "@hypr/ui/components/ui/textarea";
import { cn } from "@hypr/ui/lib/utils";

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

  const handleSubmit = () => {
    confirm("Thank you!", { title: "Send Feedback?" }).then((confirmed) => {
      if (!confirmed) {
        return;
      }

      try {
        Sentry.sendFeedback({
          message: description,
          email,
          tags: { type: selectedType },
        });
      } catch (error) {
        console.error(error);
        return;
      }

      setDescription("");
      setEmail("");
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-600">
        <Trans>Help us improve the Hyprnote experience by providing feedback.</Trans>
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

      <Button onClick={handleSubmit} disabled={!description.trim()}>
        <Trans>Submit Feedback</Trans>
      </Button>
    </div>
  );
}
