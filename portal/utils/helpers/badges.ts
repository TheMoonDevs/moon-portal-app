import { BUFF_LEVEL } from "@prisma/client";

export const getPoints = (content: string) => {
  const points = (content?.match(/\n/g) || []).length + 1;
  return points;
};

export const getColorsForBuffLevel = (level: BUFF_LEVEL) => {
  switch (level) {
    case BUFF_LEVEL.TRUTH_SEEKER:
      return ['#4caf50', '#81c784'];
    case BUFF_LEVEL.BABY_GROOT:
      return ['#8bc34a', '#c5e1a5'];
    case BUFF_LEVEL.WORK_HULK:
      return ['#f44336', '#ef5350'];
    case BUFF_LEVEL.VAMPIRE_LORD:
      return ['#9c27b0', '#d81b60'];
    case BUFF_LEVEL.ALIEN_PREDATOR:
      return ['#ff5722', '#ff8a65'];
    case BUFF_LEVEL.DEVIL:
      return ['#f44336', '#d50000'];
    default:
      return ['#e0e0e0', '#9e9e9e'];
  }
};

export const isValidContent = (content: string) => {
  const trimmedContent = content.trim();
  return trimmedContent.length > 0 && /[a-zA-Z0-9]/.test(trimmedContent);
};

export const getBuffLevelAndTitle = (points: number) => {
  if (points < 10)
    return {
      level: BUFF_LEVEL.TRUTH_SEEKER,
      title: 'Truth Seeker',
      src: '/images/buff/truthSeeker.jpeg',
    };
  if (points < 25)
    return {
      level: BUFF_LEVEL.BABY_GROOT,
      title: 'Baby Groot',
      src: '/images/buff/babyGroot.jpeg',
    };
  if (points < 100)
    return {
      level: BUFF_LEVEL.WORK_HULK,
      title: 'Work Hulk',
      src: '/images/buff/workHulk.jpeg',
    };
  if (points < 150)
    return {
      level: BUFF_LEVEL.VAMPIRE_LORD,
      title: 'Vampire Lord',
      src: '/images/buff/vampire.jpeg',
    };
  if (points < 200)
    return {
      level: BUFF_LEVEL.ALIEN_PREDATOR,
      title: 'Alien Predator',
      src: '/images/buff/alien.jpeg',
    };
  return {
    level: BUFF_LEVEL.DEVIL,
    title: 'Devil',
    src: '/images/buff/devil.jpeg',
  };
};