import { ArrowRight } from "lucide-react";

interface NewUserBannerProps {
  onDemoClick: () => void;
}

export const NewUserBanner = ({ onDemoClick }: NewUserBannerProps) => {
  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-md">
      <div className="flex items-center justify-between">
        <span>하이퍼노트에 대해서 궁금하신가요?</span>
        <button
          onClick={onDemoClick}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50"
        >
          <span>데모 체험</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
