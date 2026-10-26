import { USERSTATUS } from '@db/client';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { db } from '@/lib/mongodb/db-client';
import { isAllowed } from '@/lib/permissions/defaults';
import {
  checkPermission,
  enforcePermission,
  getSessionUser,
  type SessionUser,
} from '@/lib/permissions/server';
import { isSuperAdminEmail } from '@/lib/permissions/superAdmin';
import {
  checkUsername,
  ensureUserAccounts,
  signInCodeTaken,
  suggestUsername,
  USERNAME_TAKEN,
} from '@/lib/users/server';
import {
  isValidSignInCode,
  normalizeSignInCode,
  normalizeUsername,
} from '@/lib/users/username';
import {
  ADMIN_EMAIL,
  passcodeEmailTemplate,
  POST_EMAIL_API,
} from '@/utils/helpers/emailTemplates';

const fail = (status: number, error: string) =>
  NextResponse.json({ status: 'fail', error }, { status });

/** Fields anyone may change on their own record. */
const SELF_EDITABLE = [
  'name',
  'avatar',
  'timezone',
  'positionTitle',
  'username',
];

/** Fields a user editor (`users:edit`) may change on anyone's record. */
const EDITOR_EDITABLE = [
  ...SELF_EDITABLE,
  'email',
  'linkedEmails',
  'status',
  'code',
];

const pickFields = (body: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => keys.includes(k)));

const normalizeEmails = (value: unknown): string[] =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .filter(
              (e): e is string => typeof e === 'string' && e.includes('@'),
            )
            .map((e) => e.trim().toLowerCase()),
        ),
      )
    : [];

/**
 * The sign-in code is only shown to the person themselves and to people who
 * can edit users. The pre-username leftovers are never sent.
 */
const withoutSecrets = (
  user: Record<string, any>,
  actor: SessionUser | null,
) => {
  const {
    password: _password,
    legacyUsername: _legacyUsername,
    code,
    ...rest
  } = user;
  if (actor && (isAllowed(actor, 'users:edit') || actor.id === user.id)) {
    return { ...rest, code };
  }
  return rest;
};

/**
 * Validate and normalize `username` and `code` in an incoming change. Returns
 * an error response when one is invalid or taken by someone else.
 */
async function identityChanges(
  data: Record<string, unknown>,
  userId?: string,
): Promise<NextResponse | null> {
  if ('username' in data) {
    data.username = normalizeUsername(data.username);
    const problem = await checkUsername(String(data.username), userId);
    if (problem) return fail(problem === USERNAME_TAKEN ? 409 : 400, problem);
  }
  if ('code' in data) {
    data.code = normalizeSignInCode(data.code);
    if (!isValidSignInCode(String(data.code))) {
      return fail(400, 'The sign-in code must be six letters or numbers.');
    }
    if (await signInCodeTaken(String(data.code), userId)) {
      return fail(409, 'That sign-in code is already taken.');
    }
  }
  return null;
}

const sameKeys = (a: unknown, b: unknown) => {
  const x = Array.isArray(a) ? [...a].sort() : [];
  const y = Array.isArray(b) ? [...b].sort() : [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

/**
 * Admin and role changes go through here so the same no-escalation rule
 * applies everywhere: you can only hand out access you already have. Values
 * equal to what is stored are not changes. Per-user grants and denials are
 * edited through /api/user/permissions.
 */
async function accessChanges(
  actor: SessionUser,
  body: Record<string, unknown>,
  existing: { isAdmin?: boolean | null; roleKeys?: string[] | null } = {},
): Promise<{ data: Record<string, unknown>; error?: NextResponse }> {
  const data: Record<string, unknown> = {};
  const adminChanged =
    'isAdmin' in body && !!body.isAdmin !== !!existing.isAdmin;
  const rolesChanged =
    'roleKeys' in body && !sameKeys(body.roleKeys, existing.roleKeys);
  if (!adminChanged && !rolesChanged) return { data };

  if (!isAllowed(actor, 'permissions:grant')) {
    return { data, error: fail(403, 'You cannot change who has access.') };
  }
  if (adminChanged) {
    if (!actor.isAdmin) {
      return { data, error: fail(403, 'Only admins can change admin access.') };
    }
    data.isAdmin = !!body.isAdmin;
  }
  if (rolesChanged) {
    const roleKeys = Array.isArray(body.roleKeys)
      ? Array.from(
          new Set(
            body.roleKeys.filter((k): k is string => typeof k === 'string'),
          ),
        )
      : [];
    const roles = roleKeys.length
      ? await db.role.findMany({ where: { key: { in: roleKeys } } })
      : [];
    if (roles.length !== roleKeys.length) {
      return { data, error: fail(400, 'Unknown role.') };
    }
    // Both the roles added and the roles taken away must be within your reach.
    const before = Array.isArray(existing.roleKeys) ? existing.roleKeys : [];
    const changedKeys = [
      ...roleKeys.filter((k) => !before.includes(k)),
      ...before.filter((k) => !roleKeys.includes(k)),
    ];
    const changedRoles = changedKeys.length
      ? await db.role.findMany({ where: { key: { in: changedKeys } } })
      : [];
    const tooMuch = changedRoles
      .flatMap((r: { permissions: string[] }) => r.permissions ?? [])
      .some((p: string) => !isAllowed(actor, p));
    if (tooMuch) {
      return {
        data,
        error: fail(
          403,
          'You cannot change a role with more access than you have.',
        ),
      };
    }
    data.roleKeys = roleKeys;
  }
  return { data };
}

export async function GET(request: NextRequest) {
  const { response, user: actor } = await checkPermission('users:read');
  if (response) return response;

  const id = request.nextUrl.searchParams.get('id');
  const username = normalizeUsername(
    request.nextUrl.searchParams.get('username'),
  );
  const status = request.nextUrl.searchParams.get('status');

  try {
    await ensureUserAccounts();
    const users = await db.user.findMany({
      where: {
        ...(id && { id }),
        ...(username && { username }),
        // A specific user is returned whatever their status; `status=ALL`
        // lists everyone.
        ...(!id &&
          !username &&
          status !== 'ALL' && { status: status || USERSTATUS.ACTIVE }),
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({
      status: 'success',
      data: {
        user: users.map((u: Record<string, any>) => withoutSecrets(u, actor)),
      },
    });
  } catch (e) {
    console.error(e);
    return fail(500, 'Could not load users.');
  }
}

/** Create a user and email them their sign-in code. */
export async function POST(request: Request) {
  const { response, user: actor } = await checkPermission('users:create');
  if (response || !actor)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = pickFields(body, EDITOR_EDITABLE);
  if (!data.name || !data.email)
    return fail(400, 'Name and email are required.');
  if (!data.code) {
    return fail(400, 'A six-character sign-in code is required.');
  }
  data.email = String(data.email).trim().toLowerCase();
  data.linkedEmails = normalizeEmails(data.linkedEmails);
  data.status = data.status || USERSTATUS.ACTIVE;

  await ensureUserAccounts();
  // No username given: pick a free one from their name or email.
  if (!normalizeUsername(data.username)) {
    data.username = await suggestUsername(
      String(data.name),
      String(data.email),
    );
  }
  const invalid = await identityChanges(data);
  if (invalid) return invalid;

  const access = await accessChanges(actor, body);
  if (access.error) return access.error;

  const now = new Date();
  const user = await db.user.create({
    data: { ...data, ...access.data, createdAt: now, updatedAt: now },
  });

  try {
    await fetch(POST_EMAIL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: data.email,
        sender: ADMIN_EMAIL,
        subject: 'Your Portal sign-in code',
        body: passcodeEmailTemplate(String(data.name), String(data.code)),
        displayName: 'Portal',
      }),
    });
  } catch (e) {
    // The user exists; the code can be shared by hand from the editor.
    console.error('Failed to send sign-in code email', e);
  }

  return NextResponse.json({
    status: 'success',
    data: { user: withoutSecrets(user, actor) },
  });
}

/**
 * Update a user. People can edit their own name, username, avatar, timezone
 * and title;
 * `users:edit` covers everyone else's details; access changes need
 * `permissions:grant`.
 */
export async function PUT(request: Request) {
  const actor = await getSessionUser();
  if (!actor) return fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return fail(400, 'id is required.');

  const isSelf = actor.id === id;
  const canEdit = isAllowed(actor, 'users:edit');
  if (!isSelf && !canEdit) {
    const denied = await enforcePermission('users:edit');
    if (denied) return denied;
  }

  const existing = await db.user.findFirst({ where: { id } });
  if (!existing) return fail(404, 'User not found.');

  if (
    body.updatedAt &&
    existing.updatedAt &&
    new Date(body.updatedAt) < new Date(existing.updatedAt)
  ) {
    return NextResponse.json(
      {
        error: 'User Data is outdated',
        latestUser: withoutSecrets(existing, actor),
      },
      { status: 409 },
    );
  }

  const data: Record<string, unknown> = pickFields(
    body,
    canEdit ? EDITOR_EDITABLE : SELF_EDITABLE,
  );
  if ('linkedEmails' in data)
    data.linkedEmails = normalizeEmails(data.linkedEmails);
  if (typeof data.email === 'string')
    data.email = data.email.trim().toLowerCase();
  if ('status' in data && isSelf) delete data.status;
  // Only validate what actually changes, so saving an old record never fails
  // on a field nobody touched.
  if (
    'username' in data &&
    normalizeUsername(data.username) === existing.username
  )
    delete data.username;
  if ('code' in data && normalizeSignInCode(data.code) === existing.code)
    delete data.code;
  const invalid = await identityChanges(data, id);
  if (invalid) return invalid;

  if (isSelf && ('roleKeys' in body || 'isAdmin' in body)) {
    // Nobody changes their own access; drop it rather than fail the save.
    delete body.roleKeys;
    delete body.isAdmin;
  }
  const access = await accessChanges(actor, body, existing);
  if (access.error) return access.error;

  const user = await db.user.update({
    where: { id },
    data: { ...data, ...access.data, updatedAt: new Date() },
  });
  return NextResponse.json({
    status: 'success',
    data: { user: withoutSecrets(user, actor) },
  });
}

/**
 * Delete a user for good. Their company memberships go with them; their
 * worklogs stay, so company history keeps its numbers.
 */
export async function DELETE(request: NextRequest) {
  const { response, user: actor } = await checkPermission('users:delete');
  if (response || !actor)
    return response ?? fail(401, 'Authentication required.');

  const body = await request.json().catch(() => ({}));
  const id =
    request.nextUrl.searchParams.get('id') ||
    (typeof body.id === 'string' ? body.id : '');
  if (!id) return fail(400, 'id is required.');
  if (id === actor.id) return fail(400, 'You cannot delete yourself.');

  const target = await db.user.findFirst({ where: { id } });
  if (!target) return fail(404, 'User not found.');
  if (
    isSuperAdminEmail(target.email) ||
    (target.linkedEmails ?? []).some((e: string) => isSuperAdminEmail(e))
  ) {
    return fail(403, 'The super admin cannot be deleted.');
  }
  if (target.isAdmin && !actor.isAdmin) {
    return fail(403, 'Only admins can delete an admin.');
  }

  await db.companyMember.deleteMany({ where: { userId: id } });
  await db.userBadge.deleteMany({ where: { userId: id } });
  await db.user.delete({ where: { id } });
  return NextResponse.json({ status: 'success', data: { id } });
}
