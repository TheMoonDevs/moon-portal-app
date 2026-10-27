import { FORM_FIELD_TYPE, type JobTask } from '@/models/hiring';

import { conceptArtistPage } from './concept-artist';
import type { TaskPageConfig } from './types';

/**
 * The intro for Social & PR Manager (Intern): launch night for a song, on a
 * rainy synthwave Mumbai in neon pink and cyan. A post goes live and its
 * numbers climb, then the song finds its playlists. The brief and the form
 * after it come from the opening, not from here.
 */
export const launchNightPage: TaskPageConfig = {
  key: 'launch-night',
  name: 'Launch night',
  theme: 'monsoon',
  scenes: [
    'dream',
    'manifesto',
    'feed',
    'playlist',
    'mark',
    'founder',
    'timeline',
  ],
  studio: conceptArtistPage.studio,
  feed: {
    kicker: 'the job, really',
    title: 'Great work dies quietly.',
    body: 'Every song we make starts at zero plays, zero followers and zero rupees. Someone has to make the city stop scrolling.',
    post: {
      handle: '@you',
      caption:
        'POV: the last train leaves at 2:04 AM and the city is underwater.',
      time: '2:04 AM',
    },
    counts: [
      { label: 'views', to: 120000 },
      { label: 'shares', to: 4200 },
      { label: 'saves', to: 9800 },
    ],
    comments: [
      'the city pop drop at 0:41 😭',
      'which anime is this from??',
      'playing this on the 2am local, perfect',
      'when does the full song drop',
    ],
    payoff: 'That someone is you.',
  },
  playlist: {
    kicker: 'where it lands',
    title: 'From one post to the playlists people fall asleep to.',
    track: { title: 'Mumbai 66', artist: 'Zone Studios' },
    rows: [
      'Late Night City Pop',
      'Synthwave for the Rain',
      'Anime Lo-fi, 2 AM',
      'Mumbai After Dark',
    ],
    slot: 'Pitched by',
  },
  mark: {
    kicker: 'Your mark',
    title: 'Every film, every track, every drop.',
    accent: 'You decide how the world hears about it.',
    credits: [
      'Music releases',
      'Anime shorts',
      'YouTube channels',
      'Discord community',
      'Reddit drops',
      'Playlist pitches',
    ],
    creditLine: 'Launched by',
  },
  team: { ...conceptArtistPage.team, joining: 'Social & PR Intern' },
  founder: conceptArtistPage.founder,
  timeline: {
    steps: [
      { when: 'Day 1', what: 'You join the studio.' },
      { when: 'Week 2', what: 'Your first campaign goes live.' },
      {
        when: 'Month 3',
        what: 'Full-time offer, ₹4L to ₹6L a year.',
      },
    ],
    note: 'The internship pays ₹10,000 to ₹20,000 a month.',
  },
  promises: [],
};

/** The first brief for this page; HR can load it in the editor and change it. */
export const launchNightStarterTask: JobTask = {
  page: 'launch-night',
  brief:
    'A girl chases the last train across a flooded Mumbai at 2 AM. The song is synthwave, and the look is anime film meets city pop. It’s called “Mumbai 66”.\n\nNobody knows it exists yet. Your job is to change that, starting with zero rupees and zero followers.',
  effort: 'About 3 to 4 hours',
  dueDays: 4,
  deliverables: [
    {
      title: 'One post, for real',
      body: "Make a meme, reel or Short about the world of Mumbai 66, using any AI you like. Post it for real in a community where it belongs (a subreddit, a Discord server, your own Instagram or YouTube), following that community's rules. Don't claim the song is already out. Three days later, tell us the numbers and what you learned.",
    },
    {
      title: 'The curator pitch',
      body: "Find 3 real playlist curators, blogs or channels that fit this track, with one line on why each. Then write the pitch to your best pick, in your own words. Don't send it.",
    },
    {
      title: 'Your thinking',
      body: 'A few lines on who this song is for, where they hang out online, and why you made the choices you did.',
    },
  ],
  closing:
    'Go further, if you like. There are no instructions for that part, and we notice.',
  fields: [
    {
      id: 'post',
      label: 'Link to your post',
      type: FORM_FIELD_TYPE.URL,
      required: true,
      helpText: 'Check it opens without logging in or asking for access.',
    },
    {
      id: 'results',
      label: 'What happened after 3 days',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
      helpText:
        "Views, likes, comments, shares, and what you'd change next time.",
    },
    {
      id: 'curators',
      label: 'Your 3 curators',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
      helpText: 'Name, link and one line on why, for each.',
    },
    {
      id: 'pitch',
      label: 'Your pitch',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
    },
    {
      id: 'thinking',
      label: 'Your thinking',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
    },
    {
      id: 'tools',
      label: 'Tools used',
      type: FORM_FIELD_TYPE.SHORT_TEXT,
      required: true,
    },
    {
      id: 'extra',
      label: 'Anything extra',
      type: FORM_FIELD_TYPE.URL,
      required: false,
      helpText: 'Links to anything else you made.',
    },
  ],
};
