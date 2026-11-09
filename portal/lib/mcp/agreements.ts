import {
  correctSigner,
  correctText,
  setEndDate,
} from '@/lib/agreements/corrections';
import { agreementsDashboard } from '@/lib/agreements/dashboard';
import { DOC_TYPES } from '@/lib/agreements/docTypes';
import { FIELD_PRESETS } from '@/lib/agreements/fields';
import { myDocuments } from '@/lib/agreements/mine';
import {
  closeRollout,
  createRollout,
  listRollouts,
  loadRollout,
  previewRollout,
  remindRollout,
  rolloutView,
  sendMissing,
  syncRollout,
} from '@/lib/agreements/rollouts';
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
  seesConfidential,
  sendAgreement,
  voidAgreement,
} from '@/lib/agreements/server';
import { STARTER_TEMPLATES } from '@/lib/agreements/templates';
import {
  personFile,
  requiredChecklist,
  searchVault,
  vaultPeople,
} from '@/lib/agreements/vault';
import { db } from '@/lib/mongodb/db-client';
import type { SessionUser } from '@/lib/permissions/server';
import { AGREEMENT_CATEGORY, AGREEMENT_STATUS } from '@/models/agreements';
import type { Company } from '@/models/workspace';

import { companiesWith, type Tool, ToolError } from './shared';

/*
 * Agreements through Claude: the same steps as the Agreements tab. Send any
 * agreement to sign, follow it, remind or withdraw it; search the vault of
 * signed documents and open a person's file. Claude never signs or approves:
 * a signature is always the person's own click.
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
          listAgreements(company.id, context.origin, {
            confidential: await seesConfidential(user, company.id),
          }),
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
              kind: a.typeLabel,
              status: a.status,
              confidential: a.confidential || undefined,
              from: a.source,
              sentAt: a.sentAt,
              completedAt: a.completedAt,
              signers: a.signers.map((s) => ({
                name: s.name,
                email: s.email,
                status: s.status,
                forCompany: s.company || undefined,
              })),
            })),
          templates: templates.map((t) => ({
            id: t.id,
            name: t.name,
            kind: t.category,
            starter: t.builtIn,
            blanks: t.blanks.map((f) => f.key),
            signerFills: t.fields.length
              ? t.fields.map((f) => ({
                  id: f.id,
                  label: f.label,
                  kind: f.kind,
                }))
              : undefined,
            version: t.builtIn ? undefined : t.version,
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
      "Sends an agreement for e-signing: each signer gets their own link by email and signs by typing (or drawing) their name. Give a template (its id or name from list_agreements, e.g. 'Mutual NDA') with values for its blanks, or your own title and Markdown text. List only the other parties as signers: the company's signer is added by the document type's rule (the owner for most, the sender for minor ones such as policy acknowledgements) and countersigns after them, unless companySigner or companyFirst says otherwise. Always call with preview: true first, show the person the text and the signers, and send only after they say yes. Never guess fees, dates or legal terms: ask.",
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
        companySigner: {
          type: 'string',
          enum: ['owner', 'lead', 'none'],
          description:
            "Who signs for the company, if not the type's rule: the owner, the sender (lead), or nobody.",
        },
        companyFirst: {
          type: 'boolean',
          description:
            'With ordered: the company signs first (an offer goes out signed), not last.',
        },
        confidential: {
          type: 'boolean',
          description:
            "Only HR and owners see it (pay, fees). Defaults to the type's setting.",
        },
        fields: {
          type: 'array',
          description: `Details a signer fills in when signing (address, PAN, bank account). Presets by id: ${FIELD_PRESETS.map((f) => f.id).join(', ')}. A template's own fields are used when this is left out.`,
          items: {
            type: 'object',
            properties: {
              preset: { type: 'string' },
              label: { type: 'string' },
              kind: {
                type: 'string',
                enum: ['text', 'longtext', 'date', 'checkbox'],
              },
              required: { type: 'boolean' },
              signer: {
                type: 'number',
                description:
                  'Which signer fills it, 1 for the first. Default 1.',
              },
              hint: { type: 'string' },
            },
          },
        },
        endsOn: {
          type: 'string',
          description:
            'When the signed agreement ends, YYYY-MM-DD: the signatory is told 30 and 7 days before.',
        },
        renews: {
          type: 'string',
          description:
            'The id of the agreement this renews, amends or replaces: they stay linked.',
        },
        linkKind: {
          type: 'string',
          enum: ['renewal', 'amendment', 'resend'],
          description: 'With renews. Default renewal.',
        },
        blocking: {
          type: 'boolean',
          description:
            'They must sign it before using the Portal (for required policies).',
        },
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
        const presets = new Map(FIELD_PRESETS.map((f) => [f.id, f]));
        const fields = Array.isArray(args?.fields)
          ? args.fields.map((f: any) => ({
              ...(typeof f?.preset === 'string' ? presets.get(f.preset) : {}),
              ...f,
            }))
          : args?.text
            ? []
            : (template?.fields ?? []);
        const input = parseAgreementInput({
          companyId: company.id,
          templateId: template && !template.builtIn ? template.id : null,
          title: args?.title || template?.title,
          body: args?.text || template?.body,
          category: args?.kind || template?.category,
          fields,
          endsOn: args?.endsOn,
          previousId: args?.renews,
          linkKind: args?.renews ? args?.linkKind || 'renewal' : null,
          blocking: args?.blocking === true,
          signers: args?.signers,
          ordered: args?.ordered === true,
          values: args?.values,
          message: args?.message,
          expiresOn: args?.expiresOn,
          ccEmails: args?.ccEmails,
          companySigner: args?.companySigner,
          companyFirst: args?.companyFirst === true,
          confidential: args?.confidential,
        });
        if (args?.preview) {
          const r = await renderAgreement(input, {
            pay: await seesConfidential(user, company.id),
          });
          return {
            preview: true,
            title: r.title,
            text: r.body,
            signers: input.signers,
            filledFromTheirRecords: r.filled,
            stillBlank: r.missing,
            theyFillIn: input.fields.map((f) => ({
              label: f.label,
              signer: input.signers[f.signer - 1]?.name ?? `Signer ${f.signer}`,
              required: f.required,
            })),
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
            forCompany: s.company || undefined,
            signUrl: s.signUrl,
          })),
          confidential: view.confidential,
          emailErrors,
          link: tabLink(context.origin, company.id, view.id),
        };
      }),
  },
  {
    name: 'manage_agreement',
    title: 'Remind, correct or withdraw an agreement',
    description:
      "For an agreement out for signing. remind emails the people whose turn it is their link again (or one signer, by signerId). correct_signer fixes a signer's name or email (signerId, name, email): a new email gets a new link and the old one stops working. correct_text replaces the title and text (title, text): everyone who signed is asked to sign again, so show the person the new text and get their OK first. end_date sets or clears (endsOn: null) the day a signed agreement ends. void withdraws it: nobody can sign after that and signers are told. Get the person's OK before correct_text or void. Signer ids are in get_agreement.",
    inputSchema: {
      type: 'object',
      properties: {
        agreement: {
          type: 'string',
          description: 'Its id, or a signing link.',
        },
        action: {
          type: 'string',
          enum: [
            'remind',
            'correct_signer',
            'correct_text',
            'end_date',
            'void',
          ],
        },
        signerId: { type: 'string' },
        name: { type: 'string', description: 'For correct_signer.' },
        email: { type: 'string', description: 'For correct_signer.' },
        title: { type: 'string', description: 'For correct_text.' },
        text: { type: 'string', description: 'For correct_text: Markdown.' },
        endsOn: {
          type: ['string', 'null'],
          description: 'For end_date: YYYY-MM-DD, or null to clear.',
        },
        note: {
          type: 'string',
          description: 'For corrections: what changed and why, in the email.',
        },
        reason: { type: 'string', description: 'For void: why, in the email.' },
      },
      required: ['agreement', 'action'],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
    visible: canRead,
    run: async (user, args, context) =>
      attempt(async () => {
        const a = await findAgreement(user, args?.agreement, 'agreements:edit');
        const signerId =
          typeof args?.signerId === 'string' ? args.signerId : null;
        if (args?.action === 'remind') {
          const res = await remindSigners(user, a, signerId, context.origin);
          return {
            reminded: true,
            status: res.agreement.status,
            emailErrors: res.emailErrors,
          };
        }
        if (args?.action === 'correct_signer') {
          if (!signerId)
            throw new ToolError('Give signerId (from get_agreement).');
          const res = await correctSigner(
            user,
            a,
            signerId,
            { name: args?.name, email: args?.email, note: args?.note },
            context.origin,
          );
          const s = res.agreement.signers.find((x) => x.id === signerId);
          return {
            corrected: true,
            signer: s
              ? { name: s.name, email: s.email, status: s.status }
              : null,
            emailErrors: res.emailErrors,
          };
        }
        if (args?.action === 'correct_text') {
          const res = await correctText(
            user,
            a,
            {
              title: args?.title ?? a.title,
              body: args?.text,
              note: args?.note,
            },
            context.origin,
          );
          return {
            corrected: true,
            signAgain: res.signAgain,
            emailErrors: res.emailErrors,
            link: tabLink(context.origin, a.companyId, a.id),
          };
        }
        if (args?.action === 'end_date') {
          const updated = await setEndDate(user, a, args?.endsOn ?? null);
          return { endsOn: updated.endsOn ?? null };
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
        throw new ToolError(
          'action is remind, correct_signer, correct_text, end_date or void.',
        );
      }),
  },
  {
    name: 'search_documents',
    title: 'Search signed documents',
    description:
      "The company's document vault: every agreement and onboarding document (offer, NDA, Trial Policy, work agreement), signed or out for signing. Filter by person (name is not enough: give their email or portal id), type, status (SENT, COMPLETED, DECLINED, VOIDED, EXPIRED, or WAITING_COMPANY for ones waiting on the company's countersignature), sent dates, project, or words in the text. Confidential ones (pay) only show for HR and owners.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Company id or name.' },
        q: {
          type: 'string',
          description: 'Words in the title, text or names.',
        },
        person: { type: 'string', description: 'An email or portal user id.' },
        type: {
          type: 'string',
          enum: DOC_TYPES.map((t) => t.key),
          description: 'Document type.',
        },
        status: { type: 'string' },
        from: { type: 'string', description: 'Sent on or after, YYYY-MM-DD.' },
        to: { type: 'string', description: 'Sent on or before, YYYY-MM-DD.' },
        project: {
          type: 'string',
          description: 'Project id: its team’s documents.',
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
        const str = (v: unknown) =>
          typeof v === 'string' && v.trim() ? v.trim() : null;
        const rows = await searchVault(
          user,
          company.id,
          {
            q: str(args?.q),
            person: str(args?.person)?.toLowerCase() ?? null,
            type: str(args?.type),
            status: str(args?.status),
            from: str(args?.from),
            to: str(args?.to),
            projectId: str(args?.project),
          },
          context.origin,
        );
        return {
          company: { id: company.id, name: company.name },
          count: rows.length,
          documents: rows.slice(0, 100).map((r) => ({
            ref: r.id,
            title: r.title,
            type: r.typeLabel,
            status: r.status,
            confidential: r.confidential || undefined,
            sentAt: r.sentAt,
            completedAt: r.completedAt,
            signers: r.signers.map((s) => ({
              name: s.name,
              email: s.email,
              status: s.status,
              forCompany: s.company || undefined,
              signedAt: s.signedAt,
            })),
            pdf: r.pdfUrl ? `${context.origin}${r.pdfUrl}` : null,
          })),
          vault: tabLink(context.origin, company.id),
        };
      }),
  },
  {
    name: 'get_person_documents',
    title: "Open a person's document file",
    description:
      "One person's file in a company: everything they signed or still have to sign, and what's missing (e.g. no NDA on file). Without person, lists the company's people with their counts.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        person: {
          type: 'string',
          description: 'Their portal user id or email.',
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
        const people = await vaultPeople(user, company.id, context.origin);
        const ref =
          typeof args?.person === 'string'
            ? args.person.trim().toLowerCase()
            : '';
        if (!ref)
          return {
            company: { id: company.id, name: company.name },
            people: people.map((p) => ({
              id: p.userId,
              name: p.name,
              email: p.email,
              signed: p.signed,
              waiting: p.waiting,
            })),
          };
        const match = people.find(
          (p) => p.userId === ref || p.email?.toLowerCase() === ref,
        );
        if (!match)
          throw new ToolError(
            `No one with "${args?.person}" in ${company.name}. Call without person for the list.`,
          );
        const file = await personFile(
          user,
          company.id,
          match.userId,
          context.origin,
        );
        return {
          person: file.person,
          missing: file.missing,
          hiddenConfidential: file.hiddenConfidential || undefined,
          documents: file.documents.map((r) => ({
            ref: r.id,
            title: r.title,
            type: r.typeLabel,
            status: r.status,
            sentAt: r.sentAt,
            completedAt: r.completedAt,
            waitingOnThem: file.waitingOnThem.includes(r.id) || undefined,
            pdf: r.pdfUrl ? `${context.origin}${r.pdfUrl}` : null,
          })),
        };
      }),
  },
  {
    name: 'agreements_overview',
    title: 'Agreements overview',
    description:
      "A company's agreements at a glance: how many are out for signing, which are stuck (a week or more, or due in two days), which wait on the company's countersignature, what was declined, how long signing takes, what ends in the next 60 days, who is missing a required document, and how open policy rollouts are going. Start here for 'what needs chasing?'.",
    inputSchema: {
      type: 'object',
      properties: { company: { type: 'string' } },
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
        const d = await agreementsDashboard(user, company.id, context.origin);
        const link = (id: string, source: string) =>
          source === 'portal' ? tabLink(context.origin, company.id, id) : null;
        return {
          company: { id: company.id, name: company.name },
          counts: d.counts,
          timeToSign: d.timeToSign,
          stuck: d.stuck.map((x) => ({ ...x, link: link(x.id, x.source) })),
          waitingOnCompany: d.waitingCompany.map((x) => ({
            ...x,
            link: link(x.id, x.source),
          })),
          declined: d.declined,
          ending: d.ending,
          requirements: d.requirements,
          rollouts: d.rollouts,
          confidentialIncluded: d.confidentialIncluded,
          tab: `${context.origin}/admin?tab=agreements&companyId=${company.id}`,
        };
      }),
  },
  {
    name: 'required_documents',
    title: 'Required documents checklist',
    description:
      "Who has signed what their role requires (an NDA for everyone, say, or a policy for interns), set in Administration > Required documents. Without send, returns each requirement with how many are signed, waiting and missing, and the people missing something. With send (a requirement id), sends that document to everyone missing it (or only userIds), a batch of 40 at a time: values fill the template's blanks once for everyone. Confirm with the person before sending, and call again while remaining is above 0.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        send: {
          type: 'string',
          description: 'A requirement id to send to the people missing it.',
        },
        userIds: { type: 'array', items: { type: 'string' } },
        values: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: "Values for the template's blanks.",
        },
        message: { type: 'string' },
        expiresOn: { type: 'string', description: 'YYYY-MM-DD.' },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canRead,
    run: async (user, args, context) =>
      attempt(async () => {
        const company = await findCompany(
          user,
          args?.company,
          typeof args?.send === 'string'
            ? 'agreements:create'
            : 'agreements:read',
        );
        if (typeof args?.send === 'string' && args.send) {
          const res = await sendMissing(
            user,
            company.id,
            args.send,
            {
              userIds: args?.userIds,
              values: args?.values,
              message: args?.message,
              expiresOn: args?.expiresOn,
            },
            context.origin,
          );
          return { requirement: args.send, ...res };
        }
        const list = await requiredChecklist(user, company.id, context.origin);
        return {
          company: { id: company.id, name: company.name },
          requirements: list.requirements.map((q) => ({
            id: q.id,
            label: q.label,
            roles: q.roles.length ? q.roles : 'everyone',
            blocking: q.blocking || undefined,
            canSendFromHere: q.sendable,
            signed: q.signed,
            waiting: q.waiting,
            missing: q.missing,
          })),
          peopleMissing: list.people
            .filter((p) => p.missing > 0)
            .map((p) => ({
              id: p.userId,
              name: p.name,
              email: p.email,
              missing: Object.entries(p.items)
                .filter(([, v]) => v?.state === 'missing')
                .map(([k]) => k),
            })),
          settings: `${context.origin}/admin?tab=required-documents&companyId=${company.id}`,
        };
      }),
  },
  {
    name: 'roll_out_policy',
    title: 'Roll out a policy to acknowledge',
    description:
      "Sends a policy (leave policy, IT policy, code of conduct) to everyone in a company, a role or a project team: each person acknowledges it with their own link, and the company doesn't countersign. Write the policy in text (Markdown) with {{signer1Name}} where the person's name goes, or start from template 'policy-acknowledgement' with values policyName and policyText. People who join later get it too unless includeNewPeople is false. Always call with preview: true first, show the text and who gets it, and send only after the person says yes.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        template: {
          type: 'string',
          description: 'A template id or name, e.g. policy-acknowledgement.',
        },
        title: { type: 'string' },
        text: { type: 'string', description: 'Markdown.' },
        values: { type: 'object', additionalProperties: { type: 'string' } },
        audience: {
          type: 'string',
          description:
            "everyone (default), a company role's name or key, or project:<project id>.",
        },
        includeNewPeople: { type: 'boolean' },
        blocking: {
          type: 'boolean',
          description: 'They must acknowledge it before using the Portal.',
        },
        daysToSign: { type: 'number', description: 'Days to acknowledge it.' },
        message: { type: 'string' },
        preview: { type: 'boolean' },
      },
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
            `No template "${ref}". Yours and the starters: ${templates.map((t) => t.name).join(', ')}.`,
          );
        const who =
          typeof args?.audience === 'string' ? args.audience.trim() : '';
        let audience: Record<string, string> = { kind: 'everyone' };
        if (who.startsWith('project:'))
          audience = { kind: 'project', projectId: who.slice(8) };
        else if (who && who.toLowerCase() !== 'everyone') {
          const roles: Array<{ key: string; name: string }> =
            await db.companyRole.findMany({ where: { companyId: company.id } });
          const role = roles.find(
            (r) => r.key === who || r.name.toLowerCase() === who.toLowerCase(),
          );
          if (!role)
            throw new ToolError(
              `No role "${who}" in ${company.name}. Roles: ${roles.map((r) => r.name).join(', ')}.`,
            );
          audience = { kind: 'role', roleKey: role.key };
        }
        const raw = {
          companyId: company.id,
          templateId: template?.id ?? null,
          title: args?.title || template?.title,
          body: args?.text || template?.body,
          values: args?.values,
          audience,
          includeNewPeople: args?.includeNewPeople !== false,
          blocking: args?.blocking === true,
          daysToSign: args?.daysToSign,
          message: args?.message,
        };
        if (args?.preview)
          return { preview: true, ...(await previewRollout(user, raw)) };
        const res = await createRollout(user, raw, context.origin);
        return {
          started: true,
          rollout: res.rollout,
          sentNow: res.sent.length,
          failed: res.failed,
          remaining: res.remaining,
          note: res.remaining
            ? 'The rest go out with policy_rollouts action send, or overnight.'
            : undefined,
        };
      }),
  },
  {
    name: 'policy_rollouts',
    title: 'Follow policy rollouts',
    description:
      "A company's policy rollouts and who has acknowledged each. With rollout (its id): everyone's status. action remind emails everyone who hasn't acknowledged yet; send sends it to people who joined since (or the rest of a big rollout); close stops sending it to new people.",
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string' },
        rollout: { type: 'string' },
        action: { type: 'string', enum: ['remind', 'send', 'close'] },
      },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    visible: canRead,
    run: async (user, args, context) =>
      attempt(async () => {
        const id = typeof args?.rollout === 'string' ? args.rollout.trim() : '';
        if (!id) {
          const company = await findCompany(
            user,
            args?.company,
            'agreements:read',
          );
          const list = await listRollouts(user, company.id);
          return {
            company: { id: company.id, name: company.name },
            rollouts: list.map((r) => ({
              id: r.id,
              title: r.title,
              status: r.status,
              audience: r.audienceText,
              sentAt: r.sentAt,
              counts: r.counts,
            })),
          };
        }
        const action = args?.action;
        const r = await loadRollout(
          user,
          id,
          action ? 'agreements:edit' : 'agreements:read',
        );
        if (action === 'remind') return remindRollout(user, r, context.origin);
        if (action === 'send') return syncRollout(user, r, context.origin);
        if (action === 'close') {
          const v = await closeRollout(user, r);
          return { closed: true, counts: v.counts };
        }
        const view = await rolloutView(r, true);
        return {
          ...view,
          people: view.people?.map((p) => ({
            name: p.name,
            email: p.email,
            status: p.status,
            signedAt: p.signedAt,
            remindedAt: p.remindedAt,
          })),
        };
      }),
  },
  {
    name: 'my_documents',
    title: 'My documents to sign',
    description:
      "The person's own documents: what's waiting for their signature or their approval for the company, and everything they signed. Claude can't sign or approve; point them to the link or to their Profile's Documents tab.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run: async (user, _args, context) =>
      attempt(async () => {
        const mine = await myDocuments(user);
        const row = (d: (typeof mine.documents)[number]) => ({
          title: d.title,
          company: d.companyName,
          as: d.as === 'company' ? 'for the company' : 'party',
          status: d.status,
          sentAt: d.sentAt,
          signedAt: d.signedAt,
          link: d.signUrl ? `${context.origin}${d.signUrl}` : null,
          pdf: d.pdfUrl ? `${context.origin}${d.pdfUrl}` : null,
        });
        return {
          toSign: mine.toSign.map(row),
          documents: mine.documents.slice(0, 100).map(row),
          hasSavedSignature: !!mine.signature,
          profile: `${context.origin}/user?tab=documents`,
        };
      }),
  },
];
