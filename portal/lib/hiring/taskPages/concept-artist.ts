import { FORM_FIELD_TYPE, type JobTask } from '@/models/hiring';

import type { TaskPageConfig } from './types';

/**
 * The intro for AI Concept Artist & Visual Designer (Intern): a concept
 * artist's sketchbook, with red-marker notes on grainy paper. The brief and
 * the form after it come from the opening, not from here.
 */
export const conceptArtistPage: TaskPageConfig = {
  key: 'concept-artist',
  name: 'Concept artist sketchbook',
  studio: {
    title: 'An AI-based film and music studio.',
    body: 'Where developers, vibe-coders, musicians and filmmakers come together to push the boundaries of creative technology.',
    icons: [
      'reel',
      'camera',
      'recordplayer',
      'vinyl',
      'headphones',
      'camcorder',
    ],
    // Posters, clips and tracks; the grid stays hidden while this is empty.
    work: [],
  },
  mark: {
    kicker: 'Your mark',
    title: 'Films, music and stories, made with AI.',
    accent: 'Your name goes in the credits.',
    credits: [
      'Music videos',
      'Short films',
      'Anime shorts',
      'Cover art',
      'Trailers & teasers',
      'Reels & shorts',
    ],
    creditLine: 'Concept Art',
  },
  // Kept for later; the team scene is hidden for now.
  team: {
    visible: false,
    members: [
      {
        name: 'Subhakar Tikkireddy',
        role: 'Founder: management, tech, design',
      },
      { name: 'Pramod Geddam', role: 'Management, HR' },
      { name: 'Tarkesh', role: 'Marketing' },
      { name: 'Sharat', role: 'Management' },
      { name: 'Shrey', role: 'Product and tech' },
      { name: 'Shakshi', role: 'HR' },
    ],
    joining: 'Design Intern (Creatives)',
  },
  founder: {
    lines: ["You won't work for a manager.", "You'll work with me."],
    name: 'Subhakar Tikkireddy',
    role: 'founder',
    image: '/images/hiring/task/subhakar-watch-cut.png',
    clock: "The clock starts when you're in.",
  },
  timeline: {
    steps: [
      { when: 'Day 1', what: 'You join the studio.' },
      { when: 'Week 2', what: 'Your first release goes out.' },
      {
        when: 'Month 3',
        what: 'Full-time offer, ₹4.5L to ₹6L a year.',
      },
    ],
    note: 'The internship pays ₹15,000 to ₹20,000 a month.',
  },
  promises: [
    { text: 'Ship in days, not quarters.', enabled: false },
    { text: 'Pitch your own story.', enabled: false },
    { text: 'Every new AI tool, on us.', enabled: false },
  ],
};

/** The first brief for this page; HR can load it in the editor and change it. */
export const conceptArtistStarterTask: JobTask = {
  page: 'concept-artist',
  brief:
    'A girl chases the last train across a flooded Mumbai at 2 AM. The song is synthwave, and the look is anime film meets city pop. Our working title is "Neon Monsoon". It\'s a placeholder. Beat it.',
  effort: 'About 3 to 4 hours',
  dueDays: 4,
  deliverables: [
    {
      title: 'The title',
      body: 'One title that would stop someone scrolling, plus two runners-up and one line on why the winner wins.',
    },
    {
      title: 'The storyboard',
      body: '6 to 8 frames that tell the story from start to end, with a one-line caption per frame saying what happens and what the shot is. The girl must clearly be the same person in every frame. Change the story as much as you like, as long as the premise is in there.',
    },
    {
      title: 'The hero poster',
      body: 'One 4:5 poster with your title. No AI image generation for this one: design it by hand, or build it with AI through code (for example Claude with Remotion). The typography is yours too.',
    },
    {
      title: 'Your thinking',
      body: 'A few lines on the idea behind your story and poster: what you wanted people to feel, and why you made the choices you did.',
    },
  ],
  closing:
    'Go further, if you like. There are no instructions for that part, and we notice.',
  fields: [
    {
      id: 'title',
      label: 'Your title',
      type: FORM_FIELD_TYPE.SHORT_TEXT,
      required: true,
    },
    {
      id: 'runners_up',
      label: 'Runners-up and why the winner wins',
      type: FORM_FIELD_TYPE.LONG_TEXT,
      required: true,
    },
    {
      id: 'storyboard',
      label: 'Storyboard',
      type: FORM_FIELD_TYPE.URL,
      required: true,
      helpText:
        'A link we can open: Drive, Figma, Behance, a PDF. Check it opens without asking for access.',
    },
    {
      id: 'poster',
      label: 'Hero poster',
      type: FORM_FIELD_TYPE.FILE,
      required: true,
      helpText: 'PNG or JPG at 4:5, up to 4 MB.',
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
