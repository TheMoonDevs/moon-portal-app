import type { HiringEmailTemplate } from '@/models/hiring';

import { MAX_BODY, MAX_SUBJECT, MAX_TEMPLATE_NAME } from './emailTemplates';
import { isStage } from './server';

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

/**
 * The editable parts of a template from an untrusted body. Only keys present
 * in the body are returned, so the same parser serves create and update.
 */
export function parseTemplateInput(body: Record<string, unknown>): {
  data: Partial<HiringEmailTemplate>;
  error: string | null;
} {
  const data: Partial<HiringEmailTemplate> = {};
  if ('name' in body) {
    data.name = text(body.name, MAX_TEMPLATE_NAME);
    if (!data.name) return { data, error: 'Give the template a name.' };
  }
  if ('subject' in body) {
    data.subject = text(body.subject, MAX_SUBJECT);
    if (!data.subject) return { data, error: 'Add a subject.' };
  }
  if ('body' in body) {
    data.body = text(body.body, MAX_BODY);
    if (!data.body) return { data, error: 'Write the email first.' };
  }
  if ('moveTo' in body) {
    if (body.moveTo && !isStage(body.moveTo))
      return { data, error: 'Unknown stage.' };
    data.moveTo = isStage(body.moveTo) ? body.moveTo : null;
  }
  return { data, error: null };
}
