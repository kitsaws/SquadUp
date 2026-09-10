export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type Team = {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
};

export type Event = {
  id: string;
  teamId: string;
  title: string;
  startsAt: string;
  location?: string;
};

export * from "./types/ai.types.js";
export * from "./types/api.types.js";
export * from "./types/team.types.js";
export * from "./types/event.types.js";
