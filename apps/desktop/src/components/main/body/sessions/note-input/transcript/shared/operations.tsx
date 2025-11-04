export type Operations = {
  onDeleteWord?: (wordId: string) => void;
  onAssignSpeaker?: (wordIds: string[], humanId: string) => void;
};
