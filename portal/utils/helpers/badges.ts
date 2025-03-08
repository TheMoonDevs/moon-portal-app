import { BUFF_LEVEL } from '@prisma/client';

export const getPoints = (content: string) => {
  const points = (content?.match(/\n/g) || []).length + 1;
  return points;
};

export const getColorsForBuffLevel = (level: BUFF_LEVEL) => {
  switch (level) {
    case BUFF_LEVEL.TRUTH_SEEKER:
      return ['#FF8041', '#FF8041'];
    case BUFF_LEVEL.BABY_GROOT:
      return ['#4caf50', '#81c784'];
    case BUFF_LEVEL.WORK_HULK:
      return ['#f44336', '#ef5350'];
    case BUFF_LEVEL.VAMPIRE_LORD:
      return ['#f44336', '#d50000'];
    case BUFF_LEVEL.ALIEN_PREDATOR:
      return ['#f44336', '#FFAB36'];
    case BUFF_LEVEL.DEVIL:
      return ['#C677FF', '#D69CFF'];
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
      marker: 1,
      title: 'Tiny Chirp',
      src: '/images/buff/tinyChirp.png',
    };
  if (points < 25)
    return {
      level: BUFF_LEVEL.BABY_GROOT,
      marker: 10,
      title: 'Baby Groot',
      src: '/images/buff/babyGroot.png',
    };
  if (points < 100)
    return {
      level: BUFF_LEVEL.WORK_HULK,
      marker: 25,
      title: 'Work Hulk',
      src: '/images/buff/workHulk.png',
    };
  if (points < 150)
    return {
      level: BUFF_LEVEL.VAMPIRE_LORD,
      marker: 100,
      title: 'Vampire Streak',
      src: '/images/buff/vampireLord.png',
    };
  if (points < 200)
    return {
      level: BUFF_LEVEL.ALIEN_PREDATOR,
      marker: 150,
      title: 'Dragon Force',
      src: '/images/buff/dragonForce.png',
    };
  return {
    level: BUFF_LEVEL.DEVIL,
    marker: 200,
    title: 'Moon Devil',
    src: '/images/buff/moonDevil.png',
  };
};
