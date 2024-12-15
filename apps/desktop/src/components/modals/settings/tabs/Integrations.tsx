import SlackIcon from "../../../../constants/icons/SlackIcon";
import NotionIcon from "../../../../constants/icons/NotionIcon";
import { ExternalLink } from "lucide-react";

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function IntegrationCard({
  title,
  description,
  icon,
  onClick,
}: IntegrationCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div>{icon}</div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <ExternalLink className="h-4 w-4" />
        연결하기
      </button>
    </div>
  );
}

export function Integrations() {
  const integrations = [
    {
      title: "Slack 연동하기",
      description: "Slack에서 미팅 알림을 받고 상태를 자동으로 업데이트하세요",
      icon: <SlackIcon />,
      onClick: () => {
        /* TODO: Implement Slack connection */
      },
    },
    {
      title: "Notion 연동하기",
      description: "미팅 노트를 Notion에 자동으로 동기화하세요",
      icon: <NotionIcon />,

      onClick: () => {
        /* TODO: Implement Notion connection */
      },
    },
  ];

  return (
    <div className="space-y-4" tabIndex={-1}>
      <div>
        <h3 className="text-lg font-medium text-gray-900">연동</h3>
        <p className="mt-1 text-sm text-gray-500">
          외부 서비스와 연동하여 생산성을 높이세요
        </p>
      </div>

      <div className="h-px bg-gray-200" />

      <div className="space-y-3">
        {integrations.map((integration, index) => (
          <IntegrationCard key={index} {...integration} />
        ))}
      </div>
    </div>
  );
}
