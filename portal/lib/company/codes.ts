/**
 * How The Moon Devs works: the dreams, the manifesto and the codes everyone
 * follows. Shown on /policies, linked from the home page and from candidates'
 * task pages.
 */

export const DREAMS = [
  'Become Millionaires, and we meant it in USDs.',
  'Inspire change in the work-world.',
  'GROW! Till our last breath on this planet.',
];

export const MANIFESTO = {
  title: 'Here, The How matters a lot more than the What & the Why.',
  body: 'TheMoonDevs never aimed to do things the common way. The corporate jungle will never dictate our path to the future. Difficult it may be, but we would rather explore the unexplored.',
};

export interface CompanyCode {
  title: string;
  body?: string;
  /** Words struck through one by one instead of a sentence. */
  strike?: string[];
  /** A short quote under the code. */
  quote?: string;
}

export const CODES: CompanyCode[] = [
  {
    title: 'Be pro-active.',
    body: 'What you do when no one asks you to is what defines your true passion.',
  },
  {
    title: 'Begin with the end in mind.',
    body: 'Life is chess. If you wish to stand at the top, first envision that.',
  },
  {
    title: 'Work when you work, play when you play.',
    body: "Work like it's a life-and-death battle, or take a leave. Never work in exhausted spirits.",
  },
  {
    title: 'Think as a team.',
    body: 'Ask for help, and help those who ask. Respect each other and grow together.',
  },
  {
    title: 'Look for a different angle.',
    body: 'There was never a rule that it has to be done that way. Explore, fail, explore again, until a new standard is born.',
  },
  {
    title: 'Explore, derive, document, systemize.',
    body: 'Build the system that never existed before.',
  },
  {
    title: 'Curb your weakness.',
    strike: [
      'Lying',
      'Jealousy',
      'Insecurity',
      'Procrastination',
      'Office Politics',
      'Discrimination',
      'Closed Groups',
    ],
  },
  {
    title:
      "The team focuses on the company's growth, and the company focuses on your growth.",
    quote: 'The law of equivalent exchange.',
  },
];

export const CODES_PATH = '/policies';
