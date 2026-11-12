import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Email,
  LegalPage,
  type LegalSection,
} from '@/components/screens/Legal/LegalPage';
import { LEGAL } from '@/lib/legal/info';

export const metadata: Metadata = {
  title: `Privacy Policy · ${LEGAL.product}`,
  description: `What ${LEGAL.product} collects, why, who it is shared with, and how to see, change or delete it.`,
};

const { product: P, operator: OP } = LEGAL;

const sections: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <>
        <p>
          {P} is a work portal run by {OP} (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
          It is the website at {LEGAL.website} and the {P} apps for iPhone and
          Android. Companies use {P} to run their teams: people log their work,
          follow projects and goals, chat, meet, hire and sign documents.
        </p>
        <p>
          When a company adds you to {P}, that company decides what it records
          about its people and who in it can see what. For that information we
          act for the company, and questions about how your company uses it are
          best asked of your company first. For everything else, such as your
          sign-in and how the service itself works, we decide and this policy
          explains how.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <>
        <h3>Your account</h3>
        <p>
          Your name, email address, username, profile photo, job title, timezone
          and roles. When you sign in with Google we receive your Google
          account&rsquo;s name, email address and photo. When you link Sign in
          with Apple we receive an identifier from Apple (and your email, if you
          choose to share it). We never see your Google or Apple password.
        </p>

        <h3>Your work</h3>
        <p>
          What you and your team put into {P}: companies, projects, tasks,
          worklogs and work points, goals, plans, pages and notes, comments,
          schedules, meeting bookings, courses and notifications.
        </p>

        <h3>Messages</h3>
        <p>
          The chats you send and receive, with the photos, videos and files you
          share in them, and whether messages were delivered and read.
        </p>

        <h3>Documents, agreements and onboarding</h3>
        <ul>
          <li>
            Documents sent to you to sign, your signature, and the signed copy.
          </li>
          <li>
            For each signature, a record of when it was made, the IP address and
            the browser or device used, and, when the sender asks for it, a code
            sent to your email to confirm it was you. This record proves the
            signature is genuine.
          </li>
          <li>
            Details a company asks for when you join it, such as your address,
            phone number, date of birth and emergency contact, and the details
            of your offer or agreement that the company enters, such as role and
            pay.
          </li>
        </ul>

        <h3>Job applications</h3>
        <p>
          If you apply for a job through a {P} application page, the details you
          send (such as name, email, phone, CV, links and answers), any task you
          hand in, and the hiring team&rsquo;s notes. We also record whether
          emails to you were delivered and opened.
        </p>

        <h3>Your phone and browser</h3>
        <ul>
          <li>
            A sign-in token for each phone (we store only a scrambled hash of
            it), the phone&rsquo;s platform (iOS or Android), the app version
            and when it was last used.
          </li>
          <li>
            A notification token, so we can send you notifications, if you turn
            them on.
          </li>
          <li>
            On the website, usage events through Google Firebase Analytics, such
            as which pages are opened. The apps do not use analytics or
            advertising tools.
          </li>
        </ul>

        <h3>What the app asks your phone for</h3>
        <p>
          The app asks first, and only when you use the feature. You can turn
          each one off in your phone&rsquo;s settings.
        </p>
        <ul>
          <li>
            <strong>Camera, photos and microphone:</strong> only to take or pick
            a profile photo, or the photos, videos and files you choose to send.
          </li>
          <li>
            <strong>Calendar:</strong> only to add your meetings to your
            calendar. The app can&rsquo;t read your calendar.
          </li>
          <li>
            <strong>Face ID or fingerprint:</strong> to lock the app, if you
            turn it on. Your phone checks it; we never receive any biometric
            data.
          </li>
          <li>
            <strong>Notifications:</strong> for messages, meetings, reminders
            and approvals.
          </li>
        </ul>
        <p>
          We do not collect your location, contacts, health data or anything
          from other apps.
        </p>

        <h3>Connected assistants</h3>
        <p>
          If you connect an AI assistant (such as Claude) to {P}, we keep the
          connection&rsquo;s name, a hash of its token and when it was last
          used, and the work it records for you.
        </p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use it',
    body: (
      <>
        <ul>
          <li>
            To run {P}: sign you in, show your work to you and your team, send
            messages, notifications and emails, and keep the apps working
            offline.
          </li>
          <li>
            To keep accounts safe: confirm who is signing in or signing a
            document, and spot misuse.
          </li>
          <li>
            For AI help: when you log work, its text may be sent to Google
            Gemini to suggest which task or goal it belongs to.
          </li>
          <li>To keep signed documents verifiable, as legal records.</li>
          <li>To answer you when you write to us, and to improve {P}.</li>
        </ul>
        <p>
          We do not sell your information, show ads, or track you across other
          companies&rsquo; apps and websites.
        </p>
        <p>
          Where the law asks for a legal basis, we rely on providing the service
          you or your company asked for, our legitimate interest in keeping it
          secure and working, legal obligations (such as keeping signed
          records), and your consent (for phone permissions and notifications,
          which you can withdraw at any time).
        </p>
      </>
    ),
  },
  {
    id: 'share',
    title: 'Who can see it',
    body: (
      <>
        <h3>People in your companies</h3>
        <p>
          What you put in a company&rsquo;s workspace is seen by people in that
          company according to the roles its admins set. Your Personal space is
          private to you.
        </p>

        <h3>Services that run {P} for us</h3>
        <p>They process information only to provide their service to us:</p>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>What it does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel</td>
              <td>Hosts the website and its servers</td>
            </tr>
            <tr>
              <td>MongoDB</td>
              <td>Database that stores accounts and work</td>
            </tr>
            <tr>
              <td>DigitalOcean</td>
              <td>Stores uploaded files, photos, videos and documents</td>
            </tr>
            <tr>
              <td>Google (Firebase, Sign-In, Gemini)</td>
              <td>
                Google sign-in, website analytics, Android notifications and AI
                suggestions
              </td>
            </tr>
            <tr>
              <td>Apple</td>
              <td>Sign in with Apple and iPhone notifications</td>
            </tr>
            <tr>
              <td>Expo</td>
              <td>Delivers notifications and updates to the apps</td>
            </tr>
            <tr>
              <td>Ably</td>
              <td>Live chat updates (new messages, typing, online)</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Sends emails</td>
            </tr>
          </tbody>
        </table>

        <h3>Apps you connect</h3>
        <p>
          AI assistants or other apps you connect can read and record work as
          you allow them. You can disconnect them in Settings at any time.
        </p>

        <h3>When the law requires it</h3>
        <p>
          We may share information when we must by law, to protect people from
          harm, or as part of a sale or merger of our business, in which case
          this policy keeps applying to it.
        </p>
      </>
    ),
  },
  {
    id: 'transfers',
    title: 'Where it is stored',
    body: (
      <p>
        {OP} is based in {LEGAL.country}. The services above may store and
        process information in other countries, including the United States and
        the European Union. When information moves across borders we rely on
        those services&rsquo; contractual safeguards.
      </p>
    ),
  },
  {
    id: 'keep',
    title: 'How long we keep it',
    body: (
      <ul>
        <li>Your account and work: while your account is open.</li>
        <li>
          When your account is deleted, we delete your profile, sign-in and
          personal work. Work you did for a company (such as tasks, worklogs and
          messages in its chats) stays with that company, no longer linked to
          your profile, because it is part of the company&rsquo;s records.
        </li>
        <li>
          Signed documents and their signing records are kept as long as the law
          or the company&rsquo;s agreement with you requires.
        </li>
        <li>
          Job applications: until the hiring company deletes them, or you ask us
          to.
        </li>
        <li>Deleted information can stay in backups for up to 30 days.</li>
      </ul>
    ),
  },
  {
    id: 'rights',
    title: 'Your choices and rights',
    body: (
      <>
        <p>You can:</p>
        <ul>
          <li>See and change your profile in the app or on the website.</li>
          <li>
            Turn off notifications, Face ID and other permissions in Settings or
            in your phone&rsquo;s settings.
          </li>
          <li>Disconnect apps and phones in Settings.</li>
          <li>
            Ask us for a copy of your information, to correct it, or to delete
            it.
          </li>
          <li>
            Delete your account: see{' '}
            <Link href="/delete-account">Delete your account</Link>.
          </li>
        </ul>
        <p>
          Depending on where you live (for example under India&rsquo;s Digital
          Personal Data Protection Act, 2023, or the GDPR in Europe), you may
          also have the right to object to or limit some uses, to withdraw
          consent, to name someone to act for you, and to complain to a data
          protection authority. Write to <Email /> and we will answer within 30
          days.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Everything travels over encrypted connections (HTTPS). Sign-in tokens
        are stored only as hashes, private files are shown only through links
        that expire within an hour, and the apps can be locked with Face ID or a
        fingerprint. No system is perfectly secure; if we learn of a breach that
        affects you, we will tell you and the authorities as the law requires.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        {P} is a tool for work and is not meant for anyone under 18. We do not
        knowingly collect information from children. If you think a child has
        given us information, write to <Email /> and we will delete it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        When we change this policy we update the date at the top. If a change
        matters, we will also tell you in {P} or by email before it applies.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        {LEGAL.grievanceOfficer
          ? `Our Grievance Officer is ${LEGAL.grievanceOfficer}. `
          : ''}
        For anything about your privacy, write to <Email />
        {LEGAL.address ? ` or to ${OP}, ${LEGAL.address}` : ''}.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      current="/privacy"
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what {P} collects about you, why, who it is
          shared with, and how you can see, change or delete it. It covers the{' '}
          {P} website and the {P} apps for iPhone and Android.
        </p>
      }
      sections={sections}
    />
  );
}
