import SlackIcon from "../../../../constants/icons/SlackIcon";
import NotionIcon from "../../../../constants/icons/NotionIcon";
import { ExternalLink } from "lucide-react";

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
}

function IntegrationCard({
  title,
  description,
  icon,
  buttonText,
  onClick,
}: IntegrationCardProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mb-6 text-center text-sm text-gray-600">{description}</p>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <ExternalLink className="h-4 w-4" />
        {buttonText}
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
      buttonText: "Slack으로 연결하기",
      onClick: () => {
        /* TODO: Implement Slack connection */
      },
    },
    {
      title: "Notion 연동하기",
      description: "미팅 노트를 Notion에 자동으로 동기화하세요",
      icon: <NotionIcon />,
      buttonText: "Notion으로 연결하기",
      onClick: () => {
        /* TODO: Implement Notion connection */
      },
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-1 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.title} {...integration} />
        ))}
      </div>
    </div>
  );
}
