import {
  ClientRequest,
  REQUESTSTATUS,
  RequestUpdate,
  UPDATEFROM,
  UPDATETYPE,
} from '@prisma/client';
import { GithubSdk } from '@/utils/services/githubSdk';
import { prisma } from '@/prisma/prisma';

// Determine new PR status based on GitHub events
export const determinePrStatus = (events: any[]): REQUESTSTATUS => {
  let lastEvent: REQUESTSTATUS = REQUESTSTATUS.UN_ASSIGNED;
  for (const e of events) {
    if (e.event === 'merged') {
      lastEvent = REQUESTSTATUS.COMPLETED;
    }
    if (e.event === 'closed') {
      lastEvent = REQUESTSTATUS.CLOSED;
    }
    if (e.event === 'review_requested') {
      lastEvent = REQUESTSTATUS.IN_REVIEW;
    }
    if (e.event === 'assigned') {
      lastEvent = REQUESTSTATUS.IN_DEVELOPMENT;
    }
    if (e.event === 'unassigned') {
      lastEvent = REQUESTSTATUS.UN_ASSIGNED;
    }
    if (e.event === 'reopened') {
      lastEvent = REQUESTSTATUS.UN_ASSIGNED;
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

interface UpdateClientRequest extends ClientRequest {
  requestUpdates: RequestUpdate[];
}

export const updateClientRequest = async (
  clientRequest: UpdateClientRequest,
) => {
  try {
    let { prNumber, prUrl, lastUpdatedAt, requestUpdates } = clientRequest;
    const lastUpdate =
      requestUpdates?.length > 0
        ? requestUpdates?.reduce((prev, current) =>
            prev?.createdAt > current?.createdAt ? prev : current,
          )
        : null;

    prNumber = lastUpdate?.prNumber || prNumber;
    prUrl = lastUpdate?.prUrl || prUrl;

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

    let events: any = await github.getPrEvents(prNumber);
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

    // if any event is merged then remove every event after that
    const mergedIndex = newEvents.findIndex(
      (event: any) => event.event === 'merged',
    );
    if (mergedIndex !== -1) {
      newEvents = newEvents.slice(0, mergedIndex + 1);
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
      await prisma.requestMessage.createMany({
        data: newEvents.map((event: any) => ({
          originClientRequestId: clientRequest.id,
          clientId: clientRequest.clientId,
          message: eventMessage(event),
          githubUrl: event.html_url,
          updateType:
            event.event === 'commented'
              ? UPDATETYPE.MESSAGE
              : UPDATETYPE.STATUS,
          updateFrom:
            event.event === 'commented'
              ? UPDATEFROM.COMMENT
              : UPDATEFROM.SYSTEM,
          metadata: event,
          createdAt: new Date(
            event?.author?.date || event?.updated_at || event?.created_at,
          ),
        })),
      });

      // if any event is merged then remove every event after that
      const mergedIndex = events.findIndex(
        (event: any) => event.event === 'merged',
      );
      if (mergedIndex !== -1) {
        events = events.slice(0, mergedIndex + 1);
      }

      const newStatus = determinePrStatus(events);
      await prisma.clientRequest.update({
        where: { id: clientRequest.id },
        data: { lastUpdatedAt: new Date(), requestStatus: newStatus },
      });
    }
  } catch (error: any) {
    console.error('Error updating PR events:', error);
    throw new Error('Error updating PR events: ', error.message);
  }
};
