/**
 * The super admin is the only person who can create (or archive) companies.
 *
 * The list lives in code on purpose: it cannot be changed from the database,
 * the admin UI or an environment variable, only by a reviewed commit. Access is
 * checked against the Google account the person proved ownership of when they
 * signed in (see `pages/api/auth/[...nextauth].ts`), never against an email
 * typed into a profile.
 */
export const SUPER_ADMIN_EMAILS: readonly string[] = [
  'subhakartikkireddy@gmail.com',
];

export const isSuperAdminEmail = (email?: string | null): boolean =>
  !!email && SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
