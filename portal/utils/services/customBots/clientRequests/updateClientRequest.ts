import {
  ClientRequests,
  PRSTATUS,
  UPDATEFROM,
  UPDATETYPE,
} from '@prisma/client';
import { GithubSdk } from '@/utils/services/githubSdk';
import { prisma } from '@/prisma/prisma';

// Determine new PR status based on GitHub events
export const determinePrStatus = (events: any[]): PRSTATUS => {
  let lastEvent: PRSTATUS = PRSTATUS.UN_ASSIGNED;
  for (const e of events) {
    if (e.event === 'merged') {
      lastEvent = PRSTATUS.COMPLETED;
    }
    if (e.event === 'closed') {
      lastEvent = PRSTATUS.CLOSED;
    }
    if (e.event === 'review_requested') {
      lastEvent = PRSTATUS.IN_REVIEW;
    }
    if (e.event === 'assigned') {
      lastEvent = PRSTATUS.IN_DEVELOPMENT;
    }
    if (e.event === 'unassigned') {
      lastEvent = PRSTATUS.UN_ASSIGNED;
    }
    if (e.event === 'reopened') {
      lastEvent = PRSTATUS.UN_ASSIGNED;
    }
  }
  return lastEvent;
};

const eventMessage = (event: any) => {
  switch (event.event) {
    case 'committed':
      return `${event?.committer?.name || event?.actor?.login || 'Bot'} added a commit: ${event?.message || event?.body}`;
    case 'commented':
      return `Msg from ${event?.actor?.login || 'Developer'}: ${event?.body}`;
    case 'review_requested':
      return `${event?.review_requester?.login || event?.actor?.login || 'Bot'} requested a review from ${event?.requested_reviewer?.login || 'Developer'}`;
    case 'assigned':
      return `${event?.actor?.login || 'Developer'} assigned this request to ${event?.assignee?.login || 'Bot'}`;
    case 'unassigned':
      return `${event?.actor?.login || 'Developer'} unassigned this request from ${event?.assignee?.login || 'Bot'}`;
    case 'closed':
      return `${event?.author?.name || event?.actor?.login || 'Developer'} closed the Request`;
    case 'reopened':
      return `${event?.author?.name || event?.actor?.login || 'Developer'} reopened the Request`;
    case 'merged':
      return `${event?.author?.name || event?.actor?.login || 'Developer'} marked this request as Completed`;
    case 'labeled':
      return `${event?.actor?.login} labeled the Request: ${event?.label?.name}`;
    case 'unlabeled':
      return `${event?.actor?.login} unlabeled the Request: ${event?.label?.name}`;
    default:
      return `${event?.author?.name || event?.actor?.login} ${event?.event} the Request`;
  }
};

export const updateClientRequest = async (clientRequest: ClientRequests) => {
  try {
    const { prNumber, prUrl, lastUpdatedAt } = clientRequest;
    if (!prNumber || !prUrl) return;

    const [owner, repo] = prUrl
      .replace('https://github.com/', '')
      .split('/')
      .slice(0, 2);
    const github = new GithubSdk({
      owner,
      repo,
      token: process.env.TMD_GITHUB_TOKEN!,
    });

    const events: any = await github.getPrEvents(prNumber);
    // console.log(events);
    let newEvents = lastUpdatedAt
      ? events.filter(
          (event: any) =>
            new Date(
              event?.author?.date || event?.updated_at || event?.created_at,
            ) > new Date(lastUpdatedAt),
        )
      : events;

    newEvents = newEvents.filter(
      (event: any) =>
        !(
          event?.event === 'commented' &&
          event?.body?.includes('<Not for Client>')
        ),
    );

    // if any event is merged then remove/ignore the next 'closed' event
    let mergedIndex =
      newEvents.findIndex((event: any) => event.event === 'merged') || -1;
    if (mergedIndex !== -1) {
      newEvents.splice(newEvents.indexOf(mergedIndex + 1), 1);
    }
    // filter out duplicate id events
    newEvents = newEvents.filter((event: any, index: number, self: any) => {
      return (
        index ===
        self.findIndex((t: any) => {
          return t.id === event.id;
        })
      );
    });
    if (newEvents.length > 0) {
      await prisma.requestUpdate.createMany({
        data: newEvents.map((event: any) => ({
          clientRequestId: clientRequest.id,
          clientId: clientRequest.clientId,
          message: eventMessage(event),
          githubUrl: event.html_url,
          updateType:
            event.event === 'commented'
              ? UPDATETYPE.COMMENT
              : UPDATETYPE.PR_UPDATE,
          updateFrom:
            event.event === 'commented' ? UPDATEFROM.BOT : UPDATEFROM.SYSTEM,
          metadata: event,
          createdAt: new Date(
            event?.author?.date || event?.updated_at || event?.created_at,
          ),
        })),
      });

      const newStatus = determinePrStatus(events);
      await prisma.clientRequests.update({
        where: { id: clientRequest.id },
        data: { lastUpdatedAt: new Date(), requestStatus: newStatus },
      });
    }
  } catch (error: any) {
    console.error('Error updating PR events:', error);
    throw new Error('Error updating PR events: ', error.message);
  }
};
