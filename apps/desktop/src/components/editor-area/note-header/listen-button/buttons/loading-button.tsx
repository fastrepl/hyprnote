import { Spinner } from "@hypr/ui/components/ui/spinner";

export function LoadingButton() {
  return (
    <div className="w-9 h-9 flex items-center justify-center">
      <Spinner />
    </div>
  );
}
