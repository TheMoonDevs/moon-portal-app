import { hasPermission } from '@/lib/permissions/matching';
import type { SessionUser } from '@/lib/permissions/server';
import { getWorkspaceForUser } from '@/lib/workspace/server';

/** A problem the assistant can fix, shown to it as the tool's answer. */
export class ToolError extends Error {}

export type ToolContext = {
  /** The portal's public origin, for links back to it. */
  origin: string;
};

export type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, boolean>;
  /** Hides the tool from people who couldn't use it. */
  visible?: (user: SessionUser) => Promise<boolean>;
  run: (user: SessionUser, args: any, context: ToolContext) => Promise<unknown>;
};

/** Companies where the person holds `permission`, by id. */
export async function companiesWith(user: SessionUser, permission: string) {
  const workspace = await getWorkspaceForUser(user);
  return new Map(
    workspace
      .filter((w) => hasPermission(w.permissions, permission))
      .map((w) => [w.company.id, w.company]),
  );
}
