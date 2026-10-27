import { FORM_FIELD_TYPE, type JobTask } from '@/models/hiring';

import { conceptArtistPage } from './concept-artist';
import type { TaskPageConfig } from './types';

/**
 * The intro for HR & Administration (Intern): a talent scout's night radar,
 * phosphor green on black. It says how we hire, through AI and creative
 * tasks, and why candidates are tested the same way. The brief and the form
 * after it come from the opening, not from here.
 */
export const talentScoutPage: TaskPageConfig = {
  key: 'talent-scout',
  name: 'Talent scout radar',
  theme: 'signal',
  scenes: ['dream', 'hiring', 'radar', 'mark', 'founder', 'timeline'],
  studio: conceptArtistPage.studio,
  hiring: {
    kicker: 'how we hire',
    title: 'Nobody here was hired off a CV.',
    strike: 'off a CV',
    chat: [
      {
        from: 'ai',
        text: 'Hey! Before you meet the team, show me something you made this week.',
      },
      {
        from: 'them',
        text: "Here's a 40-second anime short I cut last night.",
      },
      {
        from: 'ai',
        text: 'Love the rain shots. Want to try a brief? You get 4 days.',
      },
      { from: 'them', text: "I'm in." },
    ],
    because:
      'Most of our hiring runs through conversations with AI, and through job posts, briefs and tasks that look nothing like a form. You would be running that machine, so it is only fair that you get tested by it.',
  },
  radar: {
    kicker: 'the job, really',
    title:
      "Great people don't apply. They're out there, making things at 2 AM.",
    body: 'We need someone who finds them first.',
    blips: [
      'A vibe-coder in Pune with 40 stars',
      'A lyricist with 300 followers',
      'A synthwave producer on SoundCloud',
      'An anime editor on a Discord server',
      'A 19-year-old making AI shorts',
    ],
    found: 'This one.',
  },
  mark: {
    kicker: 'Your mark',
    title: 'Every film, every track, every person on the team.',
    accent: 'You found them first.',
    credits: [
      'AI concept artists',
      'Vibe-coders',
      'Music producers',
      'Lyricists',
      'Filmmakers',
      'Editors',
    ],
    creditLine: 'Found by',
  },
  team: { ...conceptArtistPage.team, joining: 'HR & Operations Intern' },
  founder: conceptArtistPage.founder,
  timeline: {
    steps: [
      { when: 'Day 1', what: 'You join the studio.' },
      { when: 'Week 2', what: 'Your first hire is in a task.' },
      {
        when: 'Month 3',
        what: 'Full-time offer, ₹3L to ₹5L a year.',
      },
    ],
    note: 'The internship pays ₹10,000 to ₹15,000 a month.',
  },
  promises: [],
};

/** The first brief for this page; HR can load it in the editor and change it. */
export const talentScoutStarterTask: JobTask = {
  page: 'talent-scout',
  brief:
    'We are hiring an AI Concept Artist. The job post is live, and it is a wall of text. Walls of text attract people who write walls of text.\n\nRemake that post with AI into something the right person would stop scrolling for. Then use AI to go out and find that person, and tell us why it is them.',
  effort: 'About 3 to 4 hours',
  dueDays: 4,
  deliverables: [
    {
      title: 'The remake',
      body: 'Our AI Concept Artist post, remade with AI tools in any format but plain text: a reel, a comic, a song, a mini-site, a carousel, a tiny game. Keep what the role really is; change everything else.',
    },
    {
      title: 'Where it goes',
      body: 'Two or three places you would post it, such as a Discord server, a subreddit, a college club or a hashtag, and why the right people hang out there and not on job boards.',
    },
    {
      title: 'The find',
      body: 'One real person, findable online today, who would be great in that role and is not famous yet. Their public work, three reasons it is them, and the first message you would send them. Do not contact them.',
    },
    {
      title: 'Your AI trail',
      body: 'The tools and the key prompts you used, and one moment where the AI got it wrong and how you caught it.',
    },
  ],
  closing:
    'Found two? Send both. There are no instructions for going further, and we notice.',
  fields: [
    {
      id: 'remake',
      label: 'Your remake of the post',
      type: FORM_FIELD_TYPE.URL,
      required: true,
      helpText:
        'A link we can open: Drive, Canva, YouTube, a site. Check it opens without asking for access.',
    },
    {
      id: 'channels',
      label: 'Where it goes, and why',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
    },
    {
      id: 'find',
      label: 'Your find: a link to their public work',
      type: FORM_FIELD_TYPE.URL,
      required: true,
    },
    {
      id: 'why',
      label: 'Three reasons it is them',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
    },
    {
      id: 'first_message',
      label: 'The first message you would send them',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
    },
    {
      id: 'ai_trail',
      label: 'Your AI trail',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
      helpText:
        'Tools, key prompts, and the moment the AI got it wrong. Paste prompts or link a shared chat.',
    },
    {
      id: 'extra',
      label: 'Anything extra',
      type: FORM_FIELD_TYPE.URL,
      required: false,
      helpText: 'A second find, or anything else you made.',
    },
  ],
};
