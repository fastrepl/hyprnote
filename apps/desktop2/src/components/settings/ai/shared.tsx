import { useState } from "react";

import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/ui/lib/utils";

export function ProviderCard({
  name,
  configured,
  modelInUse,
  handleSelectProvider,
}: {
  name: string;
  configured?: boolean;
  modelInUse?: string;
  handleSelectProvider?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
    handleSelectProvider?.();
  };

  return (
    <div
      className={cn([
        "border rounded-lg transition-all cursor-pointer",
        isOpen
          ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50/30"
          : "border-gray-200 bg-white hover:border-gray-300",
      ])}
    >
      <div className="p-4" onClick={handleClick}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900">{name}</span>
            {configured && (
              <span className="text-xs text-green-700 flex items-center gap-1">
                <span>✓</span>
                <span>API key configured</span>
              </span>
            )}
          </div>
          <span className="text-gray-400 text-xl font-light">{isOpen ? "−" : "+"}</span>
        </div>
        {modelInUse && (
          <p className="text-xs text-gray-500 mt-2">
            Model being used: <span className="font-mono text-gray-700">{modelInUse}</span>
          </p>
        )}
      </div>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-200 mt-2">
          <div className="mt-4">
            <Input
              placeholder={`Paste your API key for ${name}`}
              type="password"
              className="placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function ModelCard({
  name,
  description,
  status,
}: {
  name: string;
  description: string;
  status: string;
}) {
  return (
    <div
      className={cn([
        "p-4 rounded-lg border-2 transition-all cursor-pointer",
      ])}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <div className="flex-shrink-0">
          <pre className="text-xs text-gray-500 whitespace-pre-wrap">{status}</pre>
        </div>
      </div>
    </div>
  );
}
