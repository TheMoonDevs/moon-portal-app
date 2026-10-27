import {
  type BaseModel,
  createCrudSchemas,
  type DateValue,
  type Loose,
  type Nullable,
} from './shared/base';

/*
 * Meet with me: every user has a personal booking link, /meet/<code>, that
 * anyone can open without signing in (like a Discord invite). Guests pick a
 * free time, the user approves, suggests another time or declines, and both
 * get an email with a calendar invite. One-to-one meetings only.
 *
 * Times are stored as UTC ISO strings; the weekly hours are wall-clock times
 * in the host's own timezone.
 */

/** `HH:mm` to `HH:mm`, in the host's timezone. */
export interface MeetTimeRange {
  start: string;
  end: string;
}

export type MeetProfile = Loose<
  BaseModel & {
    userId: string;
    /** The invite code in the link. Changing it retires the old link. */
    code: string;
    /** Off means the link says the person isn't taking meetings. */
    isActive: boolean;
    /** Shown on the booking page, e.g. "Interview with Jane". */
    title?: Nullable<string>;
    description?: Nullable<string>;
    durationMinutes: number;
    /** Kept free before and after every meeting. */
    bufferMinutes: number;
    /** How far ahead a guest must book. */
    minNoticeHours: number;
    /** How many days ahead guests can book. */
    maxDaysAhead: number;
    /** Most meetings in one day; 0 for no limit. */
    dailyLimit: number;
    /** IANA timezone the weekly hours are in. */
    timezone: string;
    /** Bookable hours for each weekday, Sunday first (index 0). */
    weekly: MeetTimeRange[][];
    /** Dates (`YYYY-MM-DD`) with no meetings at all. */
    daysOff: string[];
    /** The host's own meeting room. Without one a Jitsi room is made. */
    meetingUrl?: Nullable<string>;
    /** Off confirms bookings straight away. */
    requiresApproval: boolean;
  }
>;

export enum MEET_BOOKING_STATUS {
  /** Waiting for the host. The time is held. */
  PENDING = 'PENDING',
  /** The host suggested a new time; waiting for the guest. */
  PROPOSED = 'PROPOSED',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
}

/** Statuses that hold the time on the host's calendar. */
export const ACTIVE_MEET_STATUSES = [
  MEET_BOOKING_STATUS.PENDING,
  MEET_BOOKING_STATUS.PROPOSED,
  MEET_BOOKING_STATUS.CONFIRMED,
];

export interface MeetBookingEvent {
  type:
    | 'REQUESTED'
    | 'CONFIRMED'
    | 'PROPOSED'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'CANCELLED';
  at: string;
  by: 'HOST' | 'GUEST';
  /** The time the event was about (PROPOSED: the new time). */
  start?: Nullable<string>;
  text?: Nullable<string>;
}

export type MeetBooking = Loose<
  BaseModel & {
    hostId: string;
    profileId: string;
    guestName: string;
    /** Lower-cased. */
    guestEmail: string;
    guestNote?: Nullable<string>;
    /** Where the guest booked from; their emails use it. */
    guestTimezone: string;
    start: string;
    end: string;
    /** The time the guest first asked for, kept when the host moves it. */
    requestedStart: string;
    status: MEET_BOOKING_STATUS;
    meetingUrl?: Nullable<string>;
    /** Secret in the guest's manage link (/meet/manage/<token>). */
    token: string;
    /** Calendar invite revision; goes up with every change. */
    sequence: number;
    /** The message left with the latest move, decline or cancel. */
    reason?: Nullable<string>;
    /** When the guest is an applicant to one of the host's companies. */
    applicationId?: Nullable<string>;
    companyId?: Nullable<string>;
    history: MeetBookingEvent[];
    decidedAt?: Nullable<DateValue>;
  }
>;

export const meetProfileSchemas = createCrudSchemas<MeetProfile>();
export const meetBookingSchemas = createCrudSchemas<MeetBooking>();
