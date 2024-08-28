import { MissionTask } from "@prisma/client";
import dayjs from "dayjs";

export const initialState = {
  title: '',
  house: '',
  housePoints: 0,
  indiePoints: 0,
  completedAt: dayjs(new Date()),
  expiresAt: dayjs(new Date()),
  isCompleted: false,
  isExpirable: true,
  todoMarkdown: '*',
  tasks: [] as MissionTask[],
};

export const initialAddTaskState = {
  title: '',
  description: '',
  indiePoints: 0,
  userId: '',
  completedAt: dayjs(new Date()),
  expiresAt: dayjs(new Date()),
  isCompleted: false,
  isExpirable: true,
  userInfo: { avatar: '', name: '', email: '', id: '' },
};
