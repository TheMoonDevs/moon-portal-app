import { NextResponse } from 'next/server';

import {
  requireApplicationPermission,
  signedFileUrl,
} from '@/lib/hiring/server';
import { fail } from '@/lib/workspace/server';
import type { ApplicationFile } from '@/models/hiring';

export const dynamic = 'force-dynamic';

type Params = { params: { applicationId: string; fieldId: string } };

/** Opens a file the candidate uploaded, through a short-lived signed link. */
export async function GET(_request: Request, { params }: Params) {
  const { response, application } = await requireApplicationPermission(
    params.applicationId,
    'hiring:read',
  );
  if (response || !application)
    return response ?? fail(401, 'Authentication required.');

  const file = application.answers?.[params.fieldId] as
    | ApplicationFile
    | undefined;
  if (!file || typeof file !== 'object' || !('key' in file))
    return fail(404, 'File not found.');

  return NextResponse.redirect(await signedFileUrl(file.key));
}
