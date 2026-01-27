import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";

export function useOnboardingState() {
  const location = useLocation();

  return useMemo(
    () => location.pathname.startsWith("/app/onboarding"),
    [location.pathname],
  );
}
