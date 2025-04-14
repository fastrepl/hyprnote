export interface BaseButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

export interface ActiveRecordButtonProps extends BaseButtonProps {
  isMicMuted?: boolean;
  isSpeakerMuted?: boolean;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onPause: () => void;
  onStop: () => void;
}

export interface AudioControlButtonProps {
  isMuted?: boolean;
  onToggle: () => void;
  type: "mic" | "speaker";
}
