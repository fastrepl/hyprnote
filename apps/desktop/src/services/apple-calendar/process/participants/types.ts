export type ParticipantMappingId = string;

export type ParticipantsSyncInput = {
  eventIds: string[];
};

export type ParticipantMappingToAdd = {
  sessionId: string;
  humanId: string;
};

export type HumanToCreate = {
  id: string;
  name: string;
  email: string;
};

export type ParticipantsSyncOutput = {
  toDelete: ParticipantMappingId[];
  toAdd: ParticipantMappingToAdd[];
  humansToCreate: HumanToCreate[];
};
