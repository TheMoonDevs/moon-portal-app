/** A designed intro shown before the task brief on /task/<token>. */
export interface TaskPageConfig {
  key: string;
  /** How the opening editor names it. */
  name: string;
  studio: {
    title: string;
    body: string;
    /** Pixel-art props in public/images/hiring/task/px-<icon>.png. */
    icons: string[];
    work: Array<{
      kind: 'poster' | 'clip' | 'track';
      title: string;
      src: string;
    }>;
  };
  mark: {
    kicker: string;
    title: string;
    accent: string;
    credits: string[];
    /** The candidate's credit: "<creditLine>: <first name>?". */
    creditLine: string;
  };
  team: {
    visible: boolean;
    members: Array<{ name: string; role: string }>;
    joining: string;
  };
  founder: {
    lines: string[];
    name: string;
    role: string;
    image: string;
    clock: string;
  };
  timeline: {
    steps: Array<{ when: string; what: string }>;
    note: string;
  };
  /** Still being confirmed; only enabled ones are shown. */
  promises: Array<{ text: string; enabled: boolean }>;
}
