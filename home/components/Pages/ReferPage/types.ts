export enum ReferScrollState {
  HERO = "HERO",
  STATS = "STATS",
  TESTIMONIALS = "TESTIMONIALS",
  VIDEO = "VIDEO",
  PROCESS = "PROCESS",
  WHY_US_AND_YOU = "WHY_US_AND_YOU",
  FAQ = "FAQ",
  FOOTER = "FOOTER",
}

export interface ReferVideoProps {
  play?: boolean;
  setPlay?: any;
  setPlayButtonClicked?: any;
  isVideoFinished?: boolean;
  setIsVideoFinished?: any;
  setScrollState?: any;
  thumbnail?: string;
}
