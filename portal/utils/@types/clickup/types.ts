export type ID = string | number;
export type Timestamp = string;

export type User = {
  id: number;
  username: string;
  color: string;
  email: string;
  profilePicture: string | null;
  initials?: string;
};

export type Status = {
  status: string;
  color: string;
  type: string;
};

export type Priority = {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
};

// Updated Task type
export type RawTask = {
  id: ID;
  name: string;
  status: Status;
  priority: Priority | null;
  assignees: User[];
  url: string;
  start_date: Timestamp | null;
  due_date: Timestamp | null;
  archived: boolean;
  [key: string]: any; // For any other properties
};
