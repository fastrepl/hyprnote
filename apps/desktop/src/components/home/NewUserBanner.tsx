import { RiArrowRightLine } from "@remixicon/react";
import { Trans } from "@lingui/react/macro";

interface NewUserBannerProps {
  onDemoClick: () => void;
}

export const NewUserBanner = ({ onDemoClick }: NewUserBannerProps) => {
  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        <Trans>home.newUser.question</Trans>
        <button
          onClick={onDemoClick}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50"
        >
          <Trans>home.newUser.tryDemo</Trans>
          <RiArrowRightLine className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
