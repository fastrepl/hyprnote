import { ReactNode } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Card, CardContent } from "@hypr/ui/components/ui/card";

interface ProfileSectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  hideAction?: boolean;
}

export function ProfileSectionHeader({
  title,
  actionLabel,
  onAction,
  hideAction = false,
}: ProfileSectionHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-zinc-800">
        <span>{title}</span>
      </h2>
      {!hideAction && actionLabel && (
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-600 hover:text-zinc-900 h-8 px-3"
          onClick={onAction}
        >
          <span>{actionLabel}</span>
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  actionLabel?: ReactNode;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="border border-gray-200 shadow-sm rounded-lg bg-gray-50">
      <CardContent className="p-6 flex flex-col items-center justify-center text-center">
        <div className="text-zinc-400 mb-3">{icon}</div>
        <p className="text-zinc-500 mb-3 font-medium">{title}</p>
        {actionLabel && (
          <Button variant="outline" size="sm" onClick={onAction}>
            <span>{actionLabel}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface LoadingSkeletonProps {
  count?: number;
}

export function LoadingSkeleton({ count = 2 }: LoadingSkeletonProps) {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="border border-gray-200 shadow-sm rounded-lg">
          <CardContent className="p-4">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
