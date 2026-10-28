/** The scenes an intro can show, in the order it lists them. */
export type TaskSceneKey =
  | 'dream'
  | 'manifesto'
  | 'hiring'
  | 'radar'
  | 'crowd'
  | 'marquee'
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
   * radar screen with phosphor-green ink, `premiere` a premiere night in
   * marquee gold on black velvet. Defaults to sketchbook.
   */
  theme?: 'sketchbook' | 'signal' | 'premiere';
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
  /**
   * One fan becoming a community: dots gather into a crescent moon as the
   * count climbs. Shown by the crowd scene.
   */
  crowd?: {
    kicker: string;
    title: string;
    body: string;
    /** What the counter reads as the crowd grows, first to last. */
    counts: string[];
    /** A hand-written line once the moon has formed. */
    note: string;
  };
  /**
   * A cinema marquee with chaser bulbs, flipping through what the studio
   * launches, with the cue run backstage for each. Shown by the marquee scene.
   */
  marquee?: {
    kicker: string;
    title: string;
    /** Words in the title circled in marker. */
    circle: string;
    /**
     * Each board: a small tag over a big line, and the cue that was run
     * backstage to get it there, hand-written under the board.
     */
    boards: Array<{ tag: string; text: string; cue: string }>;
    /** The last board, once the house is full. `{firstName}` in its cue is filled in. */
    finale: { tag: string; text: string; cue: string };
  };
  /** Still being confirmed; only enabled ones are shown. */
  promises: Array<{ text: string; enabled: boolean }>;
}
