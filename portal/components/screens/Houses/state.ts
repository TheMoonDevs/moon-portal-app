import dayjs, { Dayjs } from 'dayjs';

export const initialMissionState = {
  house: '',
  completed: false,
  housePoints: 0,
  indiePoints: 0,
  completedAt: null as Dayjs | null,
  expirable: true,
  expiresAt: null as Dayjs | null,
  title: '',
  description: '*',
};

export const initialTaskState = {
  missionId: '',
  userId: '',
  title: '',
  description: '',
  indiePoints: 0,
  completedAt: null as Dayjs | null,
  completed: false,
  expirable: true,
  expiresAt: null as Dayjs | null,
  avatar: '',
  name: '',
  email: '',
  userInfoId: '',
};
