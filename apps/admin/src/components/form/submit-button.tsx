import { Button } from "@hypr/ui/components/ui/button";
import { Loader2 } from "lucide-react";

import { useFormContext } from "src/lib/form";

type Props = {
  label: string;
};

export const SubmitButton = ({ label }: Props) => {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => [state.isSubmitting, state.canSubmit]}
      children={([isSubmitting, canSubmit]) => (
        <Button disabled={isSubmitting || !canSubmit} type="submit">
          {label}
          {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      )}
    />
  );
};
