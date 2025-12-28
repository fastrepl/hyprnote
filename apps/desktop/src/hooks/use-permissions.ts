import { useMutation, useQuery } from "@tanstack/react-query";
import { message } from "@tauri-apps/plugin-dialog";

import { commands as permissionsCommands } from "@hypr/plugin-permissions";

import { relaunch } from "../store/tinybase/save";

export function usePermissions() {
  const micPermissionStatus = useQuery({
    queryKey: ["micPermission"],
    queryFn: () => permissionsCommands.checkPermission("microphone"),
    refetchInterval: 1000,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const systemAudioPermissionStatus = useQuery({
    queryKey: ["systemAudioPermission"],
    queryFn: () => permissionsCommands.checkPermission("systemAudio"),
    refetchInterval: 1000,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const accessibilityPermissionStatus = useQuery({
    queryKey: ["accessibilityPermission"],
    queryFn: () => permissionsCommands.checkPermission("accessibility"),
    refetchInterval: 1000,
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const micPermission = useMutation({
    mutationFn: () => permissionsCommands.requestPermission("microphone"),
    onSuccess: () => {
      setTimeout(() => {
        void micPermissionStatus.refetch();
      }, 1000);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const systemAudioPermission = useMutation({
    mutationFn: () => permissionsCommands.requestPermission("systemAudio"),
    onSuccess: () => {
      void message("The app will now restart to apply the changes", {
        kind: "info",
        title: "System Audio Status Changed",
      });
      setTimeout(() => relaunch(), 2000);
    },
    onError: console.error,
  });

  const accessibilityPermission = useMutation({
    mutationFn: () => permissionsCommands.requestPermission("accessibility"),
    onSuccess: () => {
      setTimeout(() => {
        void accessibilityPermissionStatus.refetch();
      }, 1000);
    },
    onError: console.error,
  });

  const openMicrophoneSettings = async () => {
    await permissionsCommands.openPermission("microphone");
  };

  const openSystemAudioSettings = async () => {
    await permissionsCommands.openPermission("systemAudio");
  };

  const openAccessibilitySettings = async () => {
    await permissionsCommands.openPermission("accessibility");
  };

  const handleMicPermissionAction = async () => {
    if (micPermissionStatus.data === "denied") {
      await openMicrophoneSettings();
    } else {
      micPermission.mutate();
    }
  };

  const handleSystemAudioPermissionAction = async () => {
    if (systemAudioPermissionStatus.data === "denied") {
      await openSystemAudioSettings();
    } else {
      systemAudioPermission.mutate(undefined);
    }
  };

  const handleAccessibilityPermissionAction = async () => {
    if (accessibilityPermissionStatus.data === "denied") {
      await openAccessibilitySettings();
    } else {
      accessibilityPermission.mutate(undefined);
    }
  };

  return {
    micPermissionStatus,
    systemAudioPermissionStatus,
    accessibilityPermissionStatus,
    micPermission,
    systemAudioPermission,
    accessibilityPermission,
    openMicrophoneSettings,
    openSystemAudioSettings,
    openAccessibilitySettings,
    handleMicPermissionAction,
    handleSystemAudioPermissionAction,
    handleAccessibilityPermissionAction,
  };
}
