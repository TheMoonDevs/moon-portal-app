/*
 * The details the public Privacy Policy, Terms and account-deletion pages
 * (`/privacy`, `/terms`, `/delete-account`) are built from. The App Store and
 * Play listings link to those pages, so change the details here and every
 * page follows. Bump `updated` whenever the wording of a page changes.
 */

export const LEGAL = {
  /** The product, as it is named in the stores. */
  product: 'Portal',
  /** Who runs Portal: the legal name of the company. */
  operator: 'The Moon Devs',
  /** Where to write about privacy, deletion and anything in the terms. */
  email: 'support@themoondevs.com',
  /** Registered postal address. Left out of the pages while empty. */
  address: '',
  /** Whose law governs the terms, and where disputes are heard. */
  country: 'India',
  courts: 'Hyderabad, Telangana',
  /**
   * The person who answers privacy complaints (India's IT Rules and DPDP Act
   * ask for one). While empty, the pages point to `email` instead.
   */
  grievanceOfficer: '',
  website: 'portal.themoondevs.com',
  /** Shown at the top of each page as "Last updated". */
  updated: '12 November 2026',
} as const;

export const LEGAL_PAGES = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/delete-account', label: 'Delete your account' },
] as const;
