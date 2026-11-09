/* Meeting links that work on the server and in the browser alike. */

/**
 * The link people join a meeting by. It goes through the portal, which
 * notes who joined (on their worklog task, see ./meetingTasks) and sends
 * them on to the meeting room. The guest's carries their manage token, so
 * it works without signing in. `origin` empty gives a relative link.
 */
export const joinLink = (
  origin: string,
  booking: { id: string; token?: string | null },
  side: 'host' | 'guest',
) =>
  `${origin}/meet/join/${booking.id}${
    side === 'guest' && booking.token ? `?t=${booking.token}` : ''
  }`;
