import {
  RiSlackFill,
  RiNotionFill,
  RiExternalLinkLine,
} from "@remixicon/react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
        <RiExternalLinkLine className="h-4 w-4" />
        {t("settings.integrations.connect")}
      </button>
    </div>
  );
}

export function Integrations() {
  const { t } = useTranslation();
  const integrations = [
    {
      title: t("settings.integrations.slack.title"),
      description: t("settings.integrations.slack.description"),
      icon: <RiSlackFill className="h-8 w-8 text-black" />,
      onClick: () => {
        /* TODO: Implement Slack connection */
      },
    },
    {
      title: t("settings.integrations.notion.title"),
      description: t("settings.integrations.notion.description"),
      icon: <RiNotionFill className="h-8 w-8 text-black" />,
      onClick: () => {
        /* TODO: Implement Notion connection */
      },
    },
  ];

  return (
    <div className="space-y-4" tabIndex={-1}>
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {t("settings.integrations.title")}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("settings.integrations.description")}
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
