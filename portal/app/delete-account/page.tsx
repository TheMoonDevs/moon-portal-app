import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Email,
  LegalPage,
  type LegalSection,
} from '@/components/screens/Legal/LegalPage';
import { LEGAL } from '@/lib/legal/info';

/*
 * How to delete a Portal account, with or without the app. Google Play asks
 * for a page like this in the Data safety form; the app's own "Delete my
 * account" screen is mobile/src/app/delete-account.tsx.
 */

export const metadata: Metadata = {
  title: `Delete your account · ${LEGAL.product}`,
  description: `How to delete your ${LEGAL.product} account and what happens to your data.`,
};

const { product: P, operator: OP } = LEGAL;
const SUBJECT = `Delete my ${P} account`;

const sections: LegalSection[] = [
  {
    id: 'app',
    title: 'In the app',
    body: (
      <ul>
        <li>
          Open {P} and go to <strong>Settings</strong>.
        </li>
        <li>
          Under <strong>Account</strong>, tap <strong>Delete my account</strong>
          .
        </li>
        <li>
          Confirm. You are signed out on that phone straight away, and the
          request goes to our admins.
        </li>
      </ul>
    ),
  },
  {
    id: 'email',
    title: 'Without the app',
    body: (
      <p>
        Email{' '}
        <a
          href={`mailto:${LEGAL.email}?subject=${encodeURIComponent(SUBJECT)}`}
        >
          {LEGAL.email}
        </a>{' '}
        from the email address you sign in with, with the subject &ldquo;
        {SUBJECT}&rdquo;. If you write from another address, we will ask you to
        confirm the account is yours before deleting it.
      </p>
    ),
  },
  {
    id: 'what',
    title: 'What happens',
    body: (
      <>
        <p>
          We delete the account within 30 days of your request, usually within a
          few days, and email you when it&rsquo;s done.
        </p>
        <h3>Deleted</h3>
        <ul>
          <li>
            Your profile: name, email, username, photo, job title and settings.
          </li>
          <li>
            Your sign-ins: linked Google and Apple accounts, phone sign-ins,
            notification tokens and connected apps.
          </li>
          <li>Your Personal space: its projects, tasks, goals and pages.</li>
        </ul>
        <h3>Kept</h3>
        <ul>
          <li>
            Work you did for a company, such as tasks, worklogs and messages in
            its chats, stays with that company without your profile, because it
            is part of the company&rsquo;s records.
          </li>
          <li>
            Signed documents and their signing records, for as long as the law
            or your agreement with the company requires.
          </li>
          <li>Copies in backups, which are cleared within 30 days.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'some',
    title: 'Deleting only some data',
    body: (
      <p>
        You can delete your own messages, pages and files in {P}, and disconnect
        phones and apps in Settings. To have other information deleted without
        closing your account, such as a job application, write to <Email />. See
        the <Link href="/privacy">Privacy Policy</Link> for everything we keep
        and why.
      </p>
    ),
  },
];

export default function DeleteAccount() {
  return (
    <LegalPage
      current="/delete-account"
      title="Delete your account"
      intro={
        <p>
          You can ask for your {P} account, made by {OP}, to be deleted at any
          time, from the app or by email.
        </p>
      }
      sections={sections}
    />
  );
}
