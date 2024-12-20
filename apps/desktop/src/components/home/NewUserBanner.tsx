import { RiArrowRightLine } from "@remixicon/react";
import { useTranslation } from "react-i18next";

interface NewUserBannerProps {
  onDemoClick: () => void;
}

export const NewUserBanner = ({ onDemoClick }: NewUserBannerProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        <span>{t('home.newUser.question')}</span>
        <button
          onClick={onDemoClick}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50"
        >
          <span>{t('home.newUser.tryDemo')}</span>
          <RiArrowRightLine className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
