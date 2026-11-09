import {
  agreementByToken,
  agreementDetail,
  AgreementError,
  agreementView,
  listAgreements,
  listTemplates,
  loadAgreement,
  parseAgreementInput,
  remindSigners,
  renderAgreement,
  sendAgreement,
  voidAgreement,
} from '@/lib/agreements/server';
import { STARTER_TEMPLATES } from '@/lib/agreements/templates';
import type { SessionUser } from '@/lib/permissions/server';
import { AGREEMENT_CATEGORY, AGREEMENT_STATUS } from '@/models/agreements';
import type { Company } from '@/models/workspace';

import { companiesWith, type Tool, ToolError } from './shared';

/*
 * Agreements through Claude: the same steps as the Agreements tab. Send any
 * agreement to sign, follow it, remind or withdraw it.
 */

const canRead = async (user: SessionUser) =>
  (await companiesWith(user, 'agreements:read')).size > 0;

async function attempt<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AgreementError) throw new ToolError(e.message);
    throw e;
  }
}

async function findCompany(
  user: SessionUser,
  ref: unknown,
  permission: string,
): Promise<Company> {
  const companies = Array.from(
    (await companiesWith(user, permission)).values(),
  );
  if (!companies.length)
    throw new ToolError(
      `You don't have ${permission} in any company. Ask a company owner for a role with Agreements access.`,
    );
  const wanted = typeof ref === 'string' ? ref.trim().toLowerCase() : '';
  if (!wanted) {
    if (companies.length === 1) return companies[0];
    throw new ToolError(
      `Say which company: ${companies.map((c) => c.name).join(', ')}.`,
    );
  }
  const match = companies.find(
    (c) => c.id === ref || c.name.trim().toLowerCase() === wanted,
  );
  if (!match)
    throw new ToolError(
      `No company "${ref}" where you can do that. Yours: ${companies.map((c) => c.name).join(', ')}.`,
    );
  return match;
}

const tabLink = (origin: string, companyId: string, id?: string) =>
  `${origin}/admin?tab=agreements&companyId=${companyId}${id ? `&agreement=${id}` : ''}`;

/** An agreement by id, or by a signing link. */
async function findAgreement(
  user: SessionUser,
  ref: unknown,
  permission: string,
) {
  const raw = typeof ref === 'string' ? ref.trim() : '';
  const token = raw.match(/\/sign\/([a-f0-9]{40})/)?.[1];
  if (token) {
    const found = await agreementByToken(token);
    if (!found) throw new ToolError('No agreement for that link.');
    return loadAgreement(user, found.agreement.id, permission);
  }
  return loadAgreement(user, raw, permission);
}

const SIGNERS_SCHEMA = {
  type: 'array',
  description:
    'Who signs. Each signs by typing their name exactly as given here, so use their full legal name.',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string' },
      role: {
        type: 'string',
        description:
          'What they sign as, e.g. Client, Contractor, For the company.',
      },
      order: {
        type: 'number',
        description:
          'With ordered: 1 signs first; the same number signs together.',
      },
    },
    required: ['name', 'email'],
  },
};

export const AGREEMENT_TOOLS: Tool[] = [
  {
    name: 'list_agreements',
    title: 'List agreements',
    description:
      "The company's agreements out for signing or signed (NDAs, contractor, client and other agreements, plus the onboarding Trial Policy, NDA and offer documents), who has signed each, and its templates. Start here.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company id or name.' },
        status: {
          type: 'string',
          enum: Object.values(AGREEMENT_STATUS),
          description: 'Only these.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    visible: canRead,
    run: async (user, args, context) =>
      attempt(async () => {
        const company = await findCompany(
          user,
          args?.company,
          'agreements:read',
        );
        const [rows, templates] = await Promise.all([
          listAgreements(company.id, context.origin),
          listTemplates(company.id),
        ]);
        return {
          company: { id: company.id, name: company.name },
          agreements: rows
            .filter((a) => !args?.status || a.status === args.status)
            .slice(0, 100)
            .map((a) => ({
              id: a.id,
              title: a.title,
              kind: a.category,
              status: a.status,
              from: a.source,
              sentAt: a.sentAt,
              completedAt: a.completedAt,
              signers: a.signers.map((s) => ({
                name: s.name,
                email: s.email,
                status: s.status,
              })),
            })),
          templates: templates.map((t) => ({
            id: t.id,
            name: t.name,
            kind: t.category,
            starter: t.builtIn,
            blanks: t.fields.map((f) => f.key),
            signerRoles: t.signerRoles,
          })),
          tab: tabLink(context.origin, company.id),
        };
      }),
  },
  {
    name: 'get_agreement',
    title: 'Get one agreement',
    description:
      'One agreement in full: each signer with their status and signing link, the signatures, the audit trail, and (with includeText) the text.',
    inputSchema: {
      type: 'object',
      properties: {
        agreement: {
          type: 'string',
          description: 'Its id, or a signing link.',
        },
        includeText: { type: 'boolean' },
      },
      required: ['agreement'],
    },
    annotations: { readOnlyHint: true },
    visible: canRead,
    run: async (user, args, context) =>
      attempt(async () => {
        const a = await findAgreement(user, args?.agreement, 'agreements:read');
        const d = await agreementDetail(a, context.origin);
        return {
          ...d,
          body: args?.includeText ? d.body : undefined,
          signatures: d.signatures.map(({ image: _i, ...s }) => s),
          link: tabLink(context.origin, a.companyId, a.id),
        };
      }),
  },
  {
    name: 'send_agreement',
    title: 'Send an agreement to sign',
    description:
      "Sends an agreement for e-signing: each signer gets their own link by email and signs by typing (or drawing) their name. Give a template (its id or name from list_agreements, e.g. 'Mutual NDA') with values for its blanks, or your own title and Markdown text. Always call with preview: true first, show the person the text and the signers, and send only after they say yes. Never guess fees, dates or legal terms: ask.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        template: {
          type: 'string',
          description:
            'Template id or name. Optional when title and text are given.',
        },
        title: { type: 'string' },
        text: {
          type: 'string',
          description: 'Markdown. Overrides the template’s text.',
        },
        kind: { type: 'string', enum: Object.values(AGREEMENT_CATEGORY) },
        signers: SIGNERS_SCHEMA,
        ordered: { type: 'boolean', description: 'Sign one after another.' },
        values: {
          type: 'object',
          description:
            "Values for the template's blanks, e.g. { purpose: '…' }.",
          additionalProperties: { type: 'string' },
        },
        message: { type: 'string', description: 'A note for the signers.' },
        expiresOn: {
          type: 'string',
          description: 'Last day to sign, YYYY-MM-DD.',
        },
        ccEmails: { type: 'array', items: { type: 'string' } },
        preview: {
          type: 'boolean',
          description: 'Return the text without sending.',
        },
      },
      required: ['signers'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canRead,
    run: async (user, args, context) =>
      attempt(async () => {
        const company = await findCompany(
          user,
          args?.company,
          'agreements:create',
        );
        const templates = await listTemplates(company.id);
        const ref =
          typeof args?.template === 'string' ? args.template.trim() : '';
        const template = ref
          ? templates.find(
              (t) =>
                t.id === ref ||
                t.name.toLowerCase() === ref.toLowerCase() ||
                t.id === `starter:${ref}`,
            )
          : null;
        if (ref && !template)
          throw new ToolError(
            `No template "${ref}". Yours and the starters: ${templates.map((t) => t.name).join(', ')}. Starter keys: ${STARTER_TEMPLATES.map((s) => s.key).join(', ')}.`,
          );
        const input = parseAgreementInput({
          companyId: company.id,
          templateId: template && !template.builtIn ? template.id : null,
          title: args?.title || template?.title,
          body: args?.text || template?.body,
          category: args?.kind || template?.category,
          signers: args?.signers,
          ordered: args?.ordered === true,
          values: args?.values,
          message: args?.message,
          expiresOn: args?.expiresOn,
          ccEmails: args?.ccEmails,
        });
        if (args?.preview) {
          const r = await renderAgreement(input);
          return {
            preview: true,
            title: r.title,
            text: r.body,
            signers: input.signers,
            stillBlank: r.missing,
          };
        }
        const { agreement, emailErrors } = await sendAgreement(
          user,
          input,
          context.origin,
        );
        const view = await agreementView(agreement, context.origin);
        return {
          sent: true,
          id: view.id,
          title: view.title,
          signers: view.signers.map((s) => ({
            name: s.name,
            email: s.email,
            status: s.status,
            signUrl: s.signUrl,
          })),
          emailErrors,
          link: tabLink(context.origin, company.id, view.id),
        };
      }),
  },
  {
    name: 'manage_agreement',
    title: 'Remind signers or withdraw an agreement',
    description:
      "remind emails the people whose turn it is their link again (or one signer, by signerId). void withdraws it: nobody can sign after that and signers are told. Get the person's OK before withdrawing.",
    inputSchema: {
      type: 'object',
      properties: {
        agreement: {
          type: 'string',
          description: 'Its id, or a signing link.',
        },
        action: { type: 'string', enum: ['remind', 'void'] },
        signerId: { type: 'string' },
        reason: { type: 'string', description: 'For void: why, in the email.' },
      },
      required: ['agreement', 'action'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    visible: canRead,
    run: async (user, args, context) =>
      attempt(async () => {
        const a = await findAgreement(user, args?.agreement, 'agreements:edit');
        if (args?.action === 'remind') {
          const res = await remindSigners(
            user,
            a,
            typeof args?.signerId === 'string' ? args.signerId : null,
            context.origin,
          );
          return {
            reminded: true,
            status: res.agreement.status,
            emailErrors: res.emailErrors,
          };
        }
        if (args?.action === 'void') {
          const updated = await voidAgreement(
            user,
            a,
            args?.reason,
            context.origin,
          );
          return { withdrawn: true, status: updated.status };
        }
        throw new ToolError('action is remind or void.');
      }),
  },
];
