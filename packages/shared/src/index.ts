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
