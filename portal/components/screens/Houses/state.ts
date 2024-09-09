import { HOUSEID, Mission, MissionTask } from '@prisma/client';
import dayjs, { Dayjs } from 'dayjs';

export const initialMissionState: Partial<Mission> = {
  id: '',
  house: HOUSEID.MANAGEMENT,
  month: '',
  completed: false,
  housePoints: 0,
  indiePoints: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  expirable: true,
  expiresAt: null,
  title: '',
  description: '*', 
};

export const initialTaskState: Partial<MissionTask> = {
  id: '',
  missionId: '',
  userId: null,
  title: null,
  description: null,
  indiePoints: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  completedAt: null,
  completed: false,
  expirable: true,
  expiresAt: null,
  avatar: '',
  name: '',
  email: '',
  userInfoId: null,
};

