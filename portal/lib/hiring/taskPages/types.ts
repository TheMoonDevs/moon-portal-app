/** The scenes an intro can show, in the order it lists them. */
export type TaskSceneKey =
  | 'dream'
  | 'manifesto'
  | 'hiring'
  | 'radar'
  | 'feed'
  | 'playlist'
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
   * radar screen with phosphor-green ink, `monsoon` a rainy synthwave night
   * in neon pink and cyan. Defaults to sketchbook.
   */
  theme?: 'sketchbook' | 'signal' | 'monsoon';
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
  /** A post going live, its numbers climbing. Shown by the feed scene. */
  feed?: {
    kicker: string;
    /** Its last word gets struck through, and the note answers it. */
    title: string;
    note: string;
    body: string;
    post: { handle: string; caption: string; time: string };
    /** Each counts up from zero as the reader scrolls. */
    counts: Array<{ label: string; to: number }>;
    comments: string[];
    payoff: string;
  };
  /** A song finding its playlists. Shown by the playlist scene. */
  playlist?: {
    kicker: string;
    title: string;
    track: { title: string; artist: string };
    /** Playlists it lands on; the candidate's pitch is the last one. */
    rows: string[];
    /** The candidate's row: "<slot> <first name>?". */
    slot: string;
  };
  /** Still being confirmed; only enabled ones are shown. */
  promises: Array<{ text: string; enabled: boolean }>;
}
