/**
 * Sets up the account App Store and Google Play reviewers use in the mobile
 * app: a reviewer user in a demo company, "Brightside Studio", with three
 * made-up teammates and a week of work to look at (projects,
 * goals, tasks in every status, worklogs, a plan, a page and chats).
 *
 * The reviewers sign in with the test sign-in: the code TEST12, then this
 * email and the password in MOBILE_TEST_PASSWORD (lib/mobile/testSignIn.ts).
 * The password is never stored here or in the database.
 *
 *   npx -y tsx --tsconfig tsconfig.json scripts/seed-review-account.ts <email>          # shows what it would do
 *   npx -y tsx --tsconfig tsconfig.json scripts/seed-review-account.ts <email> --apply  # does it
 *
 * Safe to run again: people and the company are found by their email and
 * marker, and the sample work is only added while the demo company has none.
 * Everything it makes goes through the same code as the portal's own tools
 * (lib/mcp), so it looks exactly like real work. Nothing is emailed.
 *
 * Reads DATABASE_URL from the environment or portal/.env.
 */
import 'dotenv/config';

import { randomInt } from 'crypto';

import {
  openDirectConversation,
  openProjectGroup,
  sendMessage,
} from '@/lib/chat/server';
import { TOOLS } from '@/lib/mcp/tools';
import { db } from '@/lib/mongodb/db-client';
import {
  type SessionUser,
  sessionUserFromRecord,
} from '@/lib/permissions/server';
import {
  ensureUserAccounts,
  signInCodeTaken,
  usernameTaken,
} from '@/lib/users/server';
import { ensureCoreProject } from '@/lib/workspace/coreProject';
import { seedCompanyRoles } from '@/lib/workspace/server';
import { MEMBER_STATUS } from '@/models/workspace';

/** Marks what this script made, so a second run finds it again. */
const MARK = 'store-review';
const COMPANY = 'Brightside Studio';
const ORIGIN =
  process.env.NEXT_PUBLIC_PORTAL_URL || 'https://portal.themoondevs.com';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const email = args
  .find((a) => a.includes('@'))
  ?.trim()
  .toLowerCase();
if (!email) {
  console.error(
    'Usage: npx -y tsx --tsconfig tsconfig.json scripts/seed-review-account.ts <reviewer email> [--apply]',
  );
  process.exit(1);
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

type Person = {
  key: 'me' | 'maya' | 'leo' | 'sara';
  name: string;
  email: string;
  username: string;
  positionTitle: string;
  roleKeys: string[];
};

const PEOPLE: Person[] = [
  {
    key: 'me',
    name: 'App Reviewer',
    email,
    username: 'appreviewer',
    positionTitle: 'Product lead',
    roleKeys: ['owner'],
  },
  {
    key: 'maya',
    name: 'Maya Chen',
    email: 'maya.chen@demo.example.com',
    username: 'maya_demo',
    positionTitle: 'Product designer',
    roleKeys: ['member'],
  },
  {
    key: 'leo',
    name: 'Leo Park',
    email: 'leo.park@demo.example.com',
    username: 'leo_demo',
    positionTitle: 'Mobile developer',
    roleKeys: ['member'],
  },
  {
    key: 'sara',
    name: 'Sara Iyer',
    email: 'sara.iyer@demo.example.com',
    username: 'sara_demo',
    positionTitle: 'Marketing',
    roleKeys: ['member'],
  },
];

const TIMEZONE = 'Asia/Kolkata';
const log = (line: string) => console.log(apply ? line : `[dry run] ${line}`);

/** YYYY-MM-DD, `offset` days from today in TIMEZONE. */
const day = (offset = 0) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + offset * 86400000));

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function freeCode() {
  for (;;) {
    const code = Array.from(
      { length: 6 },
      () => CODE_CHARS[randomInt(CODE_CHARS.length)],
    ).join('');
    if (!(await signInCodeTaken(code))) return code;
  }
}

async function freeUsername(base: string) {
  for (let n = 1; ; n++) {
    const name = n === 1 ? base : `${base}${n}`;
    if (!(await usernameTaken(name))) return name;
  }
}

/** The person's user, made when missing. */
async function ensureUser(person: Person) {
  const found = await db.user.findFirst({ where: { email: person.email } });
  if (found) {
    log(`${person.name}: already there (${person.email})`);
    if (apply && found.status !== 'ACTIVE')
      await db.user.update({
        where: { id: found.id },
        data: { status: 'ACTIVE', updatedAt: new Date() },
      });
    return found;
  }
  log(`${person.name}: create user ${person.email}`);
  if (!apply) return null;
  const now = new Date();
  return db.user.create({
    data: {
      name: person.name,
      email: person.email,
      linkedEmails: [],
      username: await freeUsername(person.username),
      code: await freeCode(),
      status: 'ACTIVE',
      positionTitle: person.positionTitle,
      timezone: TIMEZONE,
      demoSeed: MARK,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function ensureCompany(ownerId: string | null) {
  const found = await db.company.findFirst({ where: { demoSeed: MARK } });
  if (found) {
    log(`${COMPANY}: already there`);
    return found;
  }
  log(`${COMPANY}: create the demo company`);
  if (!apply || !ownerId) return null;
  const now = new Date().toISOString();
  let slug = 'brightside-studio';
  if (await db.company.findFirst({ where: { slug } }))
    slug = `${slug}-${Date.now().toString(36)}`;
  const company = await db.company.create({
    data: {
      name: COMPANY,
      slug,
      description:
        'A small design and app studio. Sample company for App Store and Google Play reviewers.',
      logo: null,
      color: '#6366f1',
      status: 'ACTIVE',
      createdById: ownerId,
      demoSeed: MARK,
      createdAt: now,
      updatedAt: now,
    },
  });
  await seedCompanyRoles(company.id);
  await ensureCoreProject(company.id, ownerId);
  return company;
}

async function ensureMember(companyId: string, userId: string, person: Person) {
  const found = await db.companyMember.findFirst({
    where: { companyId, userId },
  });
  if (found) return;
  const now = new Date().toISOString();
  await db.companyMember.create({
    data: {
      companyId,
      userId,
      roleKeys: person.roleKeys,
      status: MEMBER_STATUS.ACTIVE,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });
}

/** Runs one of the portal's own tools as this person. */
async function tool(user: SessionUser, name: string, input: unknown) {
  const found = TOOLS.find((t) => t.name === name);
  if (!found) throw new Error(`No tool ${name}`);
  return (await found.run(user, input, { origin: ORIGIN })) as any;
}

async function seedWork(
  companyId: string,
  as: Record<Person['key'], SessionUser>,
) {
  const { me, maya, leo, sara } = as;
  const everyone = [me, maya, leo, sara];

  // Projects, with their teams and colors.
  const projects = [
    {
      name: 'Mobile app launch',
      lead: me,
      team: everyone,
      color: '#6366f1',
      description:
        'Ship the Brightside app to the App Store and Google Play, then grow its beta testers.',
    },
    {
      name: 'Website refresh',
      lead: maya,
      team: [me, maya, leo],
      color: '#0ea5e9',
      description: 'A faster, simpler studio website with new case studies.',
    },
    {
      name: 'Social media',
      lead: sara,
      team: [me, sara, maya],
      color: '#f97316',
      description: 'Three posts a week about what the studio is making.',
    },
  ];
  const ids: Record<string, string> = {};
  for (const p of projects) {
    const made = await tool(me, 'create_project', {
      company: companyId,
      name: p.name,
      description: p.description,
      effort: 'MEDIUM',
    });
    ids[p.name] = made.project.id;
    await db.project.update({
      where: { id: made.project.id },
      data: {
        color: p.color,
        leadIds: [p.lead.id],
        memberIds: p.team.filter((u) => u.id !== p.lead.id).map((u) => u.id),
        demoSeed: MARK,
      },
    });
    log(`Project: ${p.name}`);
  }

  // Goals: a target the app tracks, and a weekly goal that makes its own tasks.
  await tool(me, 'set_goal', {
    project: ids['Mobile app launch'],
    kind: 'target',
    title: 'Beta testers',
    target: 50,
  });
  await tool(me, 'update_goal_progress', {
    project: ids['Mobile app launch'],
    goal: 'Beta testers',
    add: 32,
  }).catch((e) => console.warn('  (goal progress skipped)', e.message));
  await tool(sara, 'set_goal', {
    project: ids['Social media'],
    kind: 'scheduled',
    title: 'Posts',
    target: 3,
    period: 'week',
    days: ['Mon', 'Wed', 'Fri'],
    people: [me.email],
  }).catch((e) => console.warn('  (weekly goal skipped)', e.message));
  log('Goals: Beta testers (target 50), Posts (3 a week)');

  // Work over the last week: each worklog line becomes a task with its status.
  const work: [SessionUser, number, string, string, string, string?][] = [
    [
      maya,
      -6,
      'Mobile app launch',
      'Design the onboarding screens',
      'done',
      'Three screens, light and dark',
    ],
    [
      leo,
      -5,
      'Mobile app launch',
      'Set up push notifications',
      'done',
      'Works on iOS and Android',
    ],
    [me, -5, 'Mobile app launch', 'Write the beta invite email', 'done'],
    [
      sara,
      -4,
      'Social media',
      'Launch teaser video',
      'done',
      '30 seconds, posted on all channels',
    ],
    [
      leo,
      -3,
      'Website refresh',
      'Speed up image loading',
      'done',
      'Homepage loads in half the time',
    ],
    [maya, -3, 'Website refresh', 'New homepage hero', 'doing'],
    [me, -2, 'Social media', 'Plan November posts', 'done'],
    [
      leo,
      -2,
      'Mobile app launch',
      'Fix the login screen on small phones',
      'blocked',
      'Waiting on the new icons',
    ],
    [
      me,
      -1,
      'Mobile app launch',
      'Write the App Store listing',
      'doing',
      'Description and keywords drafted',
    ],
    [
      maya,
      -1,
      'Mobile app launch',
      'App icon and screenshots',
      'done',
      'Exported for both stores',
    ],
    [
      me,
      0,
      'Mobile app launch',
      'Review the beta feedback',
      'waiting',
      'Needs your call on the top three asks',
    ],
    [me, 0, 'Website refresh', 'Case study: Brightside app', 'doing'],
    [sara, 0, 'Social media', 'Behind-the-scenes post', 'doing'],
  ];
  for (const [user, offset, project, text, status, note] of work) {
    await tool(user, 'log_work', {
      date: day(offset),
      points: [{ text, project, status, ...(note && { note }) }],
    });
  }
  log(`Worklogs: ${work.length} lines over the last week`);

  // Tasks teammates gave the reviewer, so "Needs you" and updates have some.
  await tool(leo, 'add_task', {
    project: ids['Mobile app launch'],
    title: 'Test the Android build',
    assignees: [me.email],
    forDate: day(0),
  });
  await tool(maya, 'add_task', {
    project: ids['Website refresh'],
    title: 'Approve the new color palette',
    assignees: [me.email],
    forDate: day(1),
  });
  await tool(me, 'add_task', {
    project: ids['Mobile app launch'],
    title: 'Submit the app for review',
    forDate: day(2),
    major: true,
  });
  log('Tasks: 3 more for the coming days');

  // A plan and a project page.
  await tool(me, 'create_plan', {
    company: companyId,
    title: 'Launch the Brightside app',
    status: 'ACTIVE',
    notes: 'Beta first, then both stores once 50 people have tried it.',
    steps: [
      { kind: 'task', text: 'Design and build the app', done: true },
      { kind: 'task', text: 'Beta with 50 testers' },
      { kind: 'task', text: 'Fix the top beta issues' },
      { kind: 'task', text: 'Submit to the App Store and Google Play' },
      { kind: 'task', text: 'Launch post and video' },
    ],
  }).catch((e) => console.warn('  (plan skipped)', e.message));
  await tool(me, 'create_page', {
    project: ids['Mobile app launch'],
    title: 'Launch checklist',
    emoji: '🚀',
    content: [
      '## Before we submit',
      '',
      '- [x] App icon and screenshots',
      '- [x] Push notifications',
      '- [ ] App Store listing',
      '- [ ] Fix the login screen on small phones',
      '',
      '## Launch day',
      '',
      '- Post the teaser video',
      '- Email the beta testers',
    ].join('\n'),
  }).catch((e) => console.warn('  (page skipped)', e.message));
  log('Plan: Launch the Brightside app; Page: Launch checklist');

  // Chats: the project's group and a direct chat.
  let n = 0;
  const say = (user: SessionUser, conversationId: string, text: string) =>
    sendMessage(user.id, conversationId, {
      clientId: `seed-${MARK}-${conversationId}-${n++}`,
      text,
    });
  const group = await openProjectGroup(me.id, ids['Mobile app launch']);
  const groupId = (group as any).id ?? (group as any).conversation?.id;
  await say(maya, groupId, 'The icon and store screenshots are ready 🎉');
  await say(leo, groupId, 'Nice! Push works on both platforms now.');
  await say(me, groupId, 'Great work. I’ll finish the listing today.');
  await say(sara, groupId, 'I’ll post the teaser once we’re in review.');
  const direct = await openDirectConversation(me.id, maya.id);
  const directId = (direct as any).id ?? (direct as any).conversation?.id;
  await say(maya, directId, 'Can you look at the new color palette today?');
  await say(me, directId, 'Yes, after lunch. Send me the file?');
  await say(maya, directId, 'Added it to the task. Thanks!');
  log('Chats: Mobile app launch group, and a chat with Maya');
}

(async () => {
  await ensureUserAccounts();
  const users: Partial<Record<Person['key'], any>> = {};
  for (const person of PEOPLE) users[person.key] = await ensureUser(person);

  const company = await ensureCompany(users.me?.id ?? null);
  if (!apply || !company) {
    log('Then: add everyone to the company and add the sample work.');
    console.log('\nNothing was written. Run again with --apply to do it.');
    process.exit(0);
  }

  for (const person of PEOPLE)
    await ensureMember(company.id, users[person.key].id, person);
  log('Members: the reviewer (owner) and three teammates');

  const as = {} as Record<Person['key'], SessionUser>;
  for (const person of PEOPLE) {
    const session = await sessionUserFromRecord(users[person.key]);
    if (!session) throw new Error(`${person.name} is not active.`);
    as[person.key] = session;
  }

  // Any project besides CORE means the sample work is there already.
  const projects = await db.project.findMany({
    where: { companyId: company.id },
  });
  if (projects.some((p: { isCore?: boolean }) => !p.isCore)) {
    log('Sample work: already there, left as it is');
  } else {
    await seedWork(company.id, as);
  }

  console.log(
    `\nDone. Reviewers sign in with the code TEST12, ${email} and the password in MOBILE_TEST_PASSWORD.`,
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
