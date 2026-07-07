// 10.7 — EventVenuePolicy: the ONLY place that decides whether
// Event.venueDetail is included in a response. Enforced entirely
// server-side — routes/events.ts calls serializeEventForViewer for every
// response shape (list, detail, my-events), so there is no code path
// where venueDetail leaves the process without going through this first.
// The spec is explicit: "não depender apenas de esconder no frontend" —
// this file is why that's true here, not just a client-side `{!revealed &&
// <Address/>}` check that a curious user could bypass by reading the
// network tab.
export type VenueVisibilityValue = 'PUBLIC_CITY_ONLY' | 'APPROVED_ATTENDEES' | 'REVEAL_24H_BEFORE'

const REVEAL_WINDOW_MS = 24 * 60 * 60 * 1000

interface EventLike {
  venueDetail: string | null
  venueVisibility: VenueVisibilityValue
  startsAt: Date
}

// Returns the venue string to show THIS viewer, or null if it must stay
// hidden. `viewerAttendanceStatus` is the viewer's OWN EventAttendance
// status for this event (or null/undefined if they have none) —
// deliberately the only piece of viewer-specific state this function
// needs, so callers can't accidentally pass someone else's approval.
export const resolveVenueForViewer = (
  event: EventLike,
  viewerAttendanceStatus: string | null | undefined,
  now: Date = new Date()
): string | null => {
  if (!event.venueDetail) return null

  switch (event.venueVisibility) {
    case 'PUBLIC_CITY_ONLY':
      // Never reveals the venue to anyone via this policy, regardless of
      // attendance — only city/country (already separate fields) are public.
      return null

    case 'APPROVED_ATTENDEES':
      return viewerAttendanceStatus === 'APPROVED' ? event.venueDetail : null

    case 'REVEAL_24H_BEFORE': {
      if (viewerAttendanceStatus !== 'APPROVED') return null
      const windowOpen = event.startsAt.getTime() - now.getTime() <= REVEAL_WINDOW_MS
      return windowOpen ? event.venueDetail : null
    }

    default:
      return null
  }
}

// Builds the safe response shape for a given viewer. `organizer` set true
// bypasses the policy entirely (the organizer always sees their own venue).
export const serializeEventForViewer = (
  event: any,
  opts: { viewerAttendanceStatus?: string | null; isOrganizer?: boolean; isAdmin?: boolean } = {}
) => {
  const { venueDetail, ...rest } = event
  const revealed = opts.isOrganizer || opts.isAdmin
    ? venueDetail
    : resolveVenueForViewer(event, opts.viewerAttendanceStatus)

  return { ...rest, venueDetail: revealed || null, venueRevealed: !!revealed }
}
