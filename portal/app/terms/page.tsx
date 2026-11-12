import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Email,
  LegalPage,
  type LegalSection,
} from '@/components/screens/Legal/LegalPage';
import { LEGAL } from '@/lib/legal/info';

export const metadata: Metadata = {
  title: `Terms & Conditions · ${LEGAL.product}`,
  description: `The terms for using the ${LEGAL.product} website and apps.`,
};

const { product: P, operator: OP } = LEGAL;

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'These terms',
    body: (
      <>
        <p>
          These terms are an agreement between you and {OP} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;) for using {P}: the website at {LEGAL.website} and
          the {P} apps for iPhone and Android. By signing in or using {P} you
          agree to them. If you use {P} for a company, you also agree for that
          company, and you confirm you are allowed to.
        </p>
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> explains how we handle
          your information and is part of these terms.
        </p>
      </>
    ),
  },
  {
    id: 'who',
    title: 'Who can use Portal',
    body: (
      <p>
        You must be at least 18 and able to enter a binding agreement. You need
        an account, which a company in {P} invites you to or which you get by
        applying for a job or being sent a document to sign. A company is set up
        in {P} only when our admins approve it.
      </p>
    ),
  },
  {
    id: 'accounts',
    title: 'Your account',
    body: (
      <ul>
        <li>
          Keep your sign-in safe and tell us at <Email /> if you think someone
          else has used your account. You are responsible for what happens under
          it.
        </li>
        <li>Keep your details accurate.</li>
        <li>
          A company&rsquo;s admins decide who is in their company, what they can
          see and do, and can remove people from it.
        </li>
      </ul>
    ),
  },
  {
    id: 'content',
    title: 'Your content',
    body: (
      <>
        <p>
          You keep the rights to what you put into {P}: your worklogs, messages,
          pages, files and documents (&ldquo;your content&rdquo;). Work you do
          for a company in {P} may also belong to that company under your
          agreement with it; these terms don&rsquo;t change that.
        </p>
        <p>
          You give us permission to store, copy, show and process your content
          only as needed to run {P} for you and the people you share it with,
          including through the services listed in our Privacy Policy.
        </p>
        <p>
          You confirm you have the right to share what you put into {P}, and
          that it doesn&rsquo;t break the law or anyone else&rsquo;s rights.
        </p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'Using Portal fairly',
    body: (
      <>
        <p>Don&rsquo;t:</p>
        <ul>
          <li>
            Break the law, or post anything unlawful, harassing, hateful,
            obscene, or that infringes someone else&rsquo;s rights.
          </li>
          <li>
            Get into accounts, companies or data you&rsquo;re not allowed to
            see, or get around any limit or security measure.
          </li>
          <li>
            Upload malware, overload or disrupt {P}, or scrape it except through
            the tools we provide (such as the connector for AI assistants).
          </li>
          <li>Pretend to be someone else, or forge or falsify signatures.</li>
          <li>Use {P} to send spam.</li>
        </ul>
        <p>We may remove content or suspend accounts that break these rules.</p>
      </>
    ),
  },
  {
    id: 'signing',
    title: 'Signing documents',
    body: (
      <>
        <p>
          {P} lets companies send documents for electronic signature. When you
          sign in {P}, you agree that your electronic signature is meant to be
          as binding as a handwritten one, to the extent the law allows (in
          India, under the Information Technology Act, 2000).
        </p>
        <p>
          {P} keeps a record of each signature so anyone can check a signed
          document on the <Link href="/verify">Verify</Link> page. The documents
          themselves are between you and the company that sent them; we are not
          a party to them and don&rsquo;t give legal advice. Some documents
          can&rsquo;t be signed electronically by law; it is up to the sender to
          use {P} only for documents that can.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI features and connected apps',
    body: (
      <>
        <p>
          Some features use AI, for example to suggest which task a worklog
          belongs to. AI suggestions can be wrong, so check them before relying
          on them.
        </p>
        <p>
          You can connect AI assistants and other apps to act for you in {P}.
          What they do with your permission counts as done by you, and their own
          terms apply to them. You can disconnect them in Settings at any time.
        </p>
      </>
    ),
  },
  {
    id: 'fees',
    title: 'Fees',
    body: (
      <p>
        {P} is free to use unless we agree otherwise in writing with you or your
        company. If we add paid plans, we will tell you the price before you are
        charged, and nothing will be charged without your agreement.
      </p>
    ),
  },
  {
    id: 'ours',
    title: 'Our service',
    body: (
      <>
        <p>
          {P}, its design, code and name belong to {OP}. These terms give you a
          personal, non-transferable right to use {P} while you follow them;
          they don&rsquo;t give you any other right in it.
        </p>
        <p>
          We keep improving {P}, so features may change or be removed. We aim to
          keep {P} available but can&rsquo;t promise it will always be
          uninterrupted or error-free.
        </p>
        <p>
          If you send us ideas or feedback, we may use them without owing you
          anything.
        </p>
      </>
    ),
  },
  {
    id: 'ending',
    title: 'Ending your use',
    body: (
      <p>
        You can stop using {P} at any time and ask for your account to be
        deleted, as explained on{' '}
        <Link href="/delete-account">Delete your account</Link>. We may suspend
        or close an account that breaks these terms or the law, or if we stop
        offering {P}, and we will tell you when we reasonably can. The sections
        on content, signatures, disclaimers, liability and law keep applying
        after an account ends.
      </p>
    ),
  },
  {
    id: 'disclaimer',
    title: 'Disclaimers',
    body: (
      <p>
        {P} is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To
        the extent the law allows, we make no promises beyond those in these
        terms, including about fitness for a particular purpose, merchantability
        or that {P} will meet every need. Records in {P}, such as worklogs and
        pay details, are kept by the companies that use it; we are not
        responsible for how a company uses them or for its decisions about its
        people.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limits on our liability',
    body: (
      <p>
        To the extent the law allows, we are not liable for indirect, incidental
        or consequential losses, or for lost profits, revenue or data, arising
        from your use of {P}. Our total liability for any claim about {P} is
        limited to the greater of the amount you paid us for {P} in the 12
        months before the claim, or INR 5,000. Nothing in these terms limits
        liability that can&rsquo;t be limited by law.
      </p>
    ),
  },
  {
    id: 'indemnity',
    title: 'Your responsibility to us',
    body: (
      <p>
        If someone makes a claim against us because of your content or your
        breach of these terms, you agree to cover our reasonable losses and
        costs from that claim, to the extent the law allows.
      </p>
    ),
  },
  {
    id: 'stores',
    title: 'The apps and the app stores',
    body: (
      <>
        <p>
          If you got the {P} app from Apple&rsquo;s App Store or Google Play,
          these terms are between you and {OP}, not Apple or Google. Apple and
          Google are not responsible for the app, its content, maintenance or
          support, or for any claim about it (such as product liability, legal
          or regulatory requirements, consumer protection or intellectual
          property). The store&rsquo;s own rules for using apps also apply.
        </p>
        <p>
          For the iPhone app: Apple has no obligation to provide support. If the
          app fails to meet any warranty that applies, you may tell Apple, and
          Apple will refund the purchase price (if any); Apple has no other
          warranty obligation for the app. You confirm you are not in a country
          under a U.S. Government embargo or on a U.S. Government list of
          prohibited or restricted parties. Apple and its subsidiaries are
          third-party beneficiaries of these terms and may enforce them against
          you.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Law and disputes',
    body: (
      <p>
        These terms are governed by the laws of {LEGAL.country}. Disputes will
        be heard by the courts of {LEGAL.courts}, unless the law where you live
        gives you the right to bring them elsewhere. Before going to court,
        please write to <Email /> so we can try to sort it out.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        We may update these terms. We change the date at the top when we do, and
        tell you in {P} or by email before an important change applies. If you
        keep using {P} after that, the new terms apply. If one part of these
        terms can&rsquo;t be enforced, the rest still applies.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact',
    body: (
      <p>
        Questions about these terms: <Email />
        {LEGAL.address ? `, or ${OP}, ${LEGAL.address}` : ''}.
      </p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      current="/terms"
      title="Terms & Conditions"
      intro={
        <p>
          Please read these terms before using {P}. They explain what you can
          expect from us and what we expect from you.
        </p>
      }
      sections={sections}
    />
  );
}
