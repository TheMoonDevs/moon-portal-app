import { FORM_FIELD_TYPE, type JobTask } from '@/models/hiring';

import { conceptArtistPage } from './concept-artist';
import type { TaskPageConfig } from './types';

/**
 * The intro for Social & PR Manager (Intern): premiere night for the studio's
 * films, tracks and games, in marquee gold on black velvet. A crowd grows
 * from one fan into a moon, and a marquee flips through everything the
 * studio launches until it reads their name. The brief and the form after it
 * come from the opening, not from here.
 */
export const studioVoicePage: TaskPageConfig = {
  key: 'studio-voice',
  name: 'Premiere night',
  theme: 'premiere',
  scenes: [
    'dream',
    'manifesto',
    'studio',
    'crowd',
    'marquee',
    'mark',
    'founder',
    'timeline',
  ],
  studio: conceptArtistPage.studio,
  crowd: {
    kicker: 'the community',
    title: 'Every crowd starts with one person who cares.',
    body: 'Our Discord, our subreddits, the comments under every film and track. You turn viewers into a crowd, and a crowd into a community that stays.',
    counts: [
      '1 fan',
      '12 in the discord',
      '340 regulars',
      '8,000 members',
      'a whole moon',
    ],
    note: "You'll be that one person first.",
  },
  marquee: {
    kicker: "what you'll own",
    title: 'Films, tracks, games. Every launch needs a voice.',
    circle: 'a voice.',
    boards: [
      { tag: 'now showing', text: 'AN AI SHORT FILM' },
      { tag: 'out now', text: 'A NEW SINGLE' },
      { tag: 'in beta', text: 'A MOBILE GAME' },
      { tag: 'live tonight', text: 'DISCORD PREMIERE' },
      { tag: 'in the press', text: 'ZONE STUDIOS' },
    ],
    starring: 'and starring',
    ticker: [
      'Community',
      'YouTube channels',
      'PR & press',
      'Creators & collabs',
      'Campaigns & memes',
      'Premieres',
      'Playlists & curators',
      'The numbers, weekly',
    ],
  },
  mark: {
    kicker: 'Your mark',
    title: 'Every film, track and game we make.',
    accent: 'The world hears about it through you.',
    credits: [
      'Community',
      'YouTube',
      'PR & press',
      'Premieres',
      'Campaigns',
      'Creators',
    ],
    creditLine: 'Community & PR',
  },
  team: { ...conceptArtistPage.team, joining: 'Social & PR Intern' },
  founder: conceptArtistPage.founder,
  timeline: {
    steps: [
      { when: 'Day 1', what: 'You join the studio.' },
      { when: 'Week 2', what: 'You run your first campaign.' },
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
export const studioVoiceStarterTask: JobTask = {
  page: 'studio-voice',
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
