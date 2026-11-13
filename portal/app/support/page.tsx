import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Email,
  LegalPage,
  type LegalSection,
} from '@/components/screens/Legal/LegalPage';
import { LEGAL } from '@/lib/legal/info';

/*
 * Where people using Portal get help. The App Store asks for a Support URL
 * (mobile/STORE_LISTING.md), and Google Play shows the contact email; both
 * point here.
 */

export const metadata: Metadata = {
  title: `Support · ${LEGAL.product}`,
  description: `Get help with ${LEGAL.product}: signing in, notifications, your account and data.`,
};

const { product: P, operator: OP } = LEGAL;

const sections: LegalSection[] = [
  {
    id: 'contact',
    title: 'Write to us',
    body: (
      <>
        <p>
          Email <Email /> from the address you sign in with. Tell us what you
          were doing, what you expected and what happened, with a screenshot if
          you can, and we&rsquo;ll answer by email.
        </p>
        <p>
          The app&rsquo;s version, at the bottom of <strong>Settings</strong>{' '}
          under About, helps us find the problem faster.
        </p>
      </>
    ),
  },
  {
    id: 'sign-in',
    title: 'Signing in',
    body: (
      <ul>
        <li>
          {P} is for members of a company that uses it. Your sign-in code comes
          from your company: ask the person who runs {P} there.
        </li>
        <li>
          Type your code, then continue with the Google account your company
          added. On iPhone you can also link Sign in with Apple in{' '}
          <strong>Settings</strong> and use it next time.
        </li>
        <li>
          &ldquo;That Google account isn&rsquo;t linked to this code&rdquo;
          means you picked a different Google account from the one on your
          profile. Pick your work account, or ask your company&rsquo;s admin to
          link this one.
        </li>
      </ul>
    ),
  },
  {
    id: 'app',
    title: 'Using the app',
    body: (
      <ul>
        <li>
          <strong>Notifications:</strong> turn them on in{' '}
          <strong>Settings → Privacy and alerts</strong>. If they stay off,
          allow them for {P} in your phone&rsquo;s settings.
        </li>
        <li>
          <strong>Offline:</strong> work you log without a connection is kept on
          the phone and sent when you&rsquo;re back online.
        </li>
        <li>
          <strong>Face ID or fingerprint lock:</strong> in{' '}
          <strong>Settings → Privacy and alerts</strong>.
        </li>
        <li>
          <strong>A lost phone:</strong> sign in on the website, open{' '}
          <strong>Settings</strong> and sign that phone out from your
          connections, or write to us and we&rsquo;ll do it.
        </li>
      </ul>
    ),
  },
  {
    id: 'data',
    title: 'Your account and data',
    body: (
      <p>
        See the <Link href="/privacy">Privacy Policy</Link> for what {OP} keeps
        and why, the <Link href="/terms">Terms &amp; Conditions</Link>, and{' '}
        <Link href="/delete-account">how to delete your account</Link>.
      </p>
    ),
  },
];

export default function Support() {
  return (
    <LegalPage
      current="/support"
      title={`${P} support`}
      intro={
        <p>
          Help with the {P} app and website, made by {OP}. Most answers are
          below; for anything else, write to <Email />.
        </p>
      }
      sections={sections}
    />
  );
}
