/** The scenes an intro can show, in the order it lists them. */
export type TaskSceneKey =
  | 'dream'
  | 'manifesto'
  | 'hiring'
  | 'radar'
  | 'studio'
  | 'mark'
  | 'team'
  | 'founder'
  | 'timeline';

/** A designed intro shown before the task brief on /task/<token>. */
export interface TaskPageConfig {
  key: string;
  /** How the opening editor names it. */
  name: string;
  /**
   * The look: `sketchbook` is grainy paper and red marker, `signal` a night
   * radar screen with phosphor-green ink. Defaults to sketchbook.
   */
  theme?: 'sketchbook' | 'signal';
  /** Which scenes to show, in order. Defaults to every scene but hiring and radar. */
  scenes?: TaskSceneKey[];
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
  /** How we hire, told as a chat. Shown by the hiring scene. */
  hiring?: {
    kicker: string;
    title: string;
    /** Words in the title struck through, like an old habit. */
    strike: string;
    chat: Array<{ from: 'ai' | 'them'; text: string }>;
    /** Why that means the candidate is tested this way. */
    because: string;
  };
  /** People out there to be found. Shown by the radar scene. */
  radar?: {
    kicker: string;
    title: string;
    body: string;
    /** Blips on the screen; the last one gets circled. */
    blips: string[];
    found: string;
  };
  /** Still being confirmed; only enabled ones are shown. */
  promises: Array<{ text: string; enabled: boolean }>;
}
