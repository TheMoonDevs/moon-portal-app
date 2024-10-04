import { HOUSEID, Mission, MissionTask } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";

export const initialMissionState: Partial<Mission> = {
  id: "",
  house: HOUSEID.MANAGEMENT,
  month: "",
  status: {
    label: "To Do",
    value: "IN_TODO",
    color: "#6b7280",
  },
  priority: null,
  completed: false,
  housePoints: 0,
  indiePoints: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  expirable: true,
  expiresAt: null,
  title: "",
  description: "*",
};

export const initialTaskState: Partial<MissionTask> = {
  missionId: "",
  userId: null,
  title: null,
  description: null,
  status: {
    label: "To Do",
    value: "IN_TODO",
    color: "#6b7280",
  },
  priority: null,
  assignees: [],
  indiePoints: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  completed: false,
  expirable: true,
  expiresAt: null,
  avatar: "",
  name: "",
  email: "",
  userInfoId: null,
};
