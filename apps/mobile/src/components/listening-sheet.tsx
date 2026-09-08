import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  RecorderFailure,
  RecorderPhase,
} from "@/audio/use-session-recorder";
import { DancingSticks } from "@/components/dancing-sticks";
import {
  CornerCurve,
  LISTENING_CONTROL_HEIGHT,
  LISTENING_CONTROL_RADIUS,
  Spacing,
  Typography,
} from "@/constants/theme";
import { createStyleHook, useColors } from "@/settings/theme-provider";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function statusLabel(phase: RecorderPhase, durationMs: number): string {
  switch (phase) {
    case "recording":
      return `Listening · ${formatDuration(durationMs)}`;
    case "saving":
      return "Saving recording…";
    case "unavailable":
      return "Microphone access needed";
    case "interrupted":
      return "Recording interrupted";
    case "save_error":
      return "Recording needs to be saved";
    case "error":
      return "Recorder unavailable";
    case "saved":
      return "Recording saved";
    default:
      return "Getting ready…";
  }
}

export function ListeningSheet({
  phase,
  failure,
  amplitude,
  durationMs,
  onStop,
  onRetry,
  onOpenSettings,
}: {
  phase: RecorderPhase;
  failure: RecorderFailure | null;
  amplitude: number;
  durationMs: number;
  onStop: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}) {
  const styles = useStyles();
  const Colors = useColors();
  const permissionDenied =
    phase === "unavailable" &&
    (failure === "permission_denied" ||
      failure === "notification_permission_denied");
  const recoverable = ["interrupted", "save_error", "error"].includes(phase);
  const handlePanelPress = permissionDenied
    ? onOpenSettings
    : recoverable
      ? onRetry
      : onStop;
  const control = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        permissionDenied
          ? "Open recording settings"
          : recoverable
            ? "Recover recording"
            : "Stop listening"
      }
      onPress={handlePanelPress}
      disabled={phase === "saving"}
      style={({ pressed }) => [styles.panel, pressed && styles.panelPressed]}
    >
      {phase === "saving" ? (
        <View style={styles.panelCenter}>
          <ActivityIndicator color={Colors.inkInverse} />
        </View>
      ) : permissionDenied ? (
        <View style={styles.panelCenter}>
          <Text style={styles.panelMessage}>
            {failure === "notification_permission_denied"
              ? "Allow recording notifications in Settings"
              : "Microphone access is off — open Settings"}
          </Text>
        </View>
      ) : phase === "interrupted" ? (
        <View style={styles.panelCenter}>
          <Text style={styles.panelMessage}>
            Interrupted — tap to save or retry
          </Text>
        </View>
      ) : phase === "save_error" ? (
        <View style={styles.panelCenter}>
          <Text style={styles.panelMessage}>Couldn't save — tap to retry</Text>
        </View>
      ) : phase === "error" ? (
        <View style={styles.panelCenter}>
          <Text style={styles.panelMessage}>Tap to recover recording</Text>
        </View>
      ) : (
        <DancingSticks
          amplitude={amplitude}
          color={Colors.inkInverse}
          height={36}
          width={80}
          stickWidth={3}
          gap={3}
        />
      )}
    </Pressable>
  );
  const label = statusLabel(phase, durationMs);

  return (
    <View style={styles.dock}>
      <View style={styles.heading}>
        <View style={styles.recordingDot} />
        <Text style={styles.headingText}>{label}</Text>
      </View>
      {control}
    </View>
  );
}

const useStyles = createStyleHook((Colors) => ({
  dock: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  headingText: { flex: 1, ...Typography.bodyStrong, color: Colors.ink },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  panel: {
    height: LISTENING_CONTROL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: LISTENING_CONTROL_RADIUS,
    borderCurve: CornerCurve.squircle,
    backgroundColor: Colors.accent,
  },
  panelPressed: { opacity: 0.9 },
  panelCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  panelMessage: { ...Typography.label, color: Colors.inkInverse },
}));
