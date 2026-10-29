import { NextResponse } from 'next/server';

import type { SessionUser } from '@/lib/permissions/server';

import type { ToolContext } from './shared';
import { originOf } from './tokens';
import { ToolError, toolList, TOOLS } from './tools';

const PROTOCOL_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];

const INSTRUCTIONS = `This is the person's work portal. Everything in it is a task, and what you log with log_work is a work point under one of their tasks. Call get_context first to learn their projects, goals, tasks and today's tasks (todayTasks). When they already have a task for the work, log under it by naming it in point; otherwise log_work makes a task for it, in the project its words fit (name the project when you know it). Keep it to 2-3 tasks per session: one per deliverable they would name in a standup (making a video is one task, its thumbnails and upload pack another). Log when you start (doing) and on the same task as it moves, saying what happened in note ("v6 rendered") rather than making a task for each revision, round or fix; end it with done, not_done or blocked. Use waiting when you need their permission or input. When they describe work, goals or tasks in a message, keep the portal in step: add_task (shared tasks too), set_goal, create_project and update_project, and log_work makes a task when they have none for the work yet. Work done early for a later week takes that week's date as forDate. Plans (create_plan, update_plan) hold their ideas: a plan lives in a company, needs no project, and its steps say what, which project, who and by when. A project's pages are its documents (handbooks, policies, notes, drafts), and pages nest inside pages: list_pages, get_page, create_page and update_page read and write them in Markdown. Goals come in two kinds. A scheduled goal repeats ("3 shorts every Mon and Thu"): set_goal with kind scheduled (or add_schedule), linked to a plan when it belongs to one, not a step; it makes its own dated tasks ("for Fri 30"), for the people it names or the whole team, and a done point about one finishes it for its day (forDate when it was for another day, so work done early counts for its own period). A target goal is one number to reach ("1,000 subscribers"): set_goal with kind target, filled by update_goal_progress; raising it keeps the same record. The portal records who finished each task. Finished tasks fill the goal they fit, and update_goal_progress adds progress no task tracks (followers, posts from a phone). move_project moves a project to another company. Every company member can add and edit projects; the people on a project (lead or team) add, change and delete its tasks and the plans with a step for it; company owners can do anything. People who hire also get job opening, applicant and email tools: show them an email with email_applicants (dryRun) and wait for their OK before sending it. When they ask to change how their character in the World looks, use get_avatar and set_avatar.`;

type RpcMessage = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: any;
};

const result = (id: RpcMessage['id'], value: unknown) => ({
  jsonrpc: '2.0',
  id,
  result: value,
});

const error = (id: RpcMessage['id'], code: number, message: string) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});

/** One JSON-RPC message. Returns null for notifications. */
export async function handleRpc(
  user: SessionUser,
  message: RpcMessage,
  context: ToolContext,
) {
  if (!message || typeof message !== 'object' || !message.method)
    return error(message?.id, -32600, 'Invalid request');
  const { id, method, params } = message;
  const isNotification = id === undefined || id === null;
  if (isNotification) return null;

  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      return result(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked)
          ? asked
          : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: 'portal',
          title: 'Portal',
          version: '1.0.0',
          websiteUrl: context.origin,
          // The Portal logo, for clients that show a server's own icon.
          icons: [
            {
              src: `${context.origin}/favicon.svg`,
              mimeType: 'image/svg+xml',
              sizes: ['any'],
            },
            {
              src: `${context.origin}/icon-192x192.png`,
              mimeType: 'image/png',
              sizes: ['192x192'],
            },
            {
              src: `${context.origin}/icon-512x512.png`,
              mimeType: 'image/png',
              sizes: ['512x512'],
            },
          ],
        },
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return result(id, {});
    case 'tools/list':
      return result(id, { tools: await toolList(user) });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return error(id, -32602, `Unknown tool: ${params?.name}`);
      try {
        if (tool.visible && !(await tool.visible(user)))
          return error(id, -32602, `Unknown tool: ${params?.name}`);
        const value = await tool.run(user, params?.arguments ?? {}, context);
        return result(id, {
          content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
          structuredContent: value,
        });
      } catch (err) {
        if (!(err instanceof ToolError))
          console.error(`MCP tool ${tool.name} failed`, err);
        return result(id, {
          content: [
            {
              type: 'text',
              text:
                err instanceof ToolError
                  ? err.message
                  : 'Something went wrong in the portal. Try again.',
            },
          ],
          isError: true,
        });
      }
    }
    case 'resources/list':
      return result(id, { resources: [] });
    case 'prompts/list':
      return result(id, { prompts: [] });
    default:
      return error(id, -32601, `Method not found: ${method}`);
  }
}

/** Tells the client where to sign the person in. */
export function unauthorized(
  request: Request,
  headers: Record<string, string>,
) {
  const origin = originOf(request);
  return NextResponse.json(
    error(null, -32001, 'Connect your portal account first.'),
    {
      status: 401,
      headers: {
        ...headers,
        'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    },
  );
}
