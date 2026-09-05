import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';

export const WORKSPACE_CALENDAR_SCOPES = [
  // Preserved existing scopes
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
  'https://www.googleapis.com/auth/drive.file',
  // Google Calendar scopes
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.acls',
  'https://www.googleapis.com/auth/calendar.acls.readonly',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.calendarlist',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.calendars',
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.events.freebusy',
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.events.owned.readonly',
  'https://www.googleapis.com/auth/calendar.events.public.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.settings.readonly'
];

export interface GoogleCalendarEventTime {
  dateTime?: string; // ISO 8601 string
  date?: string;     // YYYY-MM-DD for all-day events
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: GoogleCalendarEventTime;
  end: GoogleCalendarEventTime;
  htmlLink?: string;
  status?: string;
  colorId?: string;
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  created?: string;
  updated?: string;
}

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: GoogleCalendarEventTime;
  end: GoogleCalendarEventTime;
  colorId?: string;
  attendees?: Array<{ email: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
}

// In-memory token storage (MANDATORY per skill guidelines: no localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Clear cached token on sign-out per skill
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    if (typeof window !== 'undefined') {
      (window as any)._googleOAuthToken = null;
    }
  }
});

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
  if (typeof window !== 'undefined' && token) {
    (window as any)._googleOAuthToken = token;
  }
}

export function getCachedAccessToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined' && (window as any)._googleOAuthToken) {
    cachedAccessToken = (window as any)._googleOAuthToken;
    return cachedAccessToken;
  }
  return null;
}

export function createGoogleCalendarProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  WORKSPACE_CALENDAR_SCOPES.forEach((scope) => {
    provider.addScope(scope);
  });
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline'
  });
  return provider;
}

/**
 * Trigger client-side OAuth popup for Google Calendar
 */
export async function connectGoogleCalendar(): Promise<{ user: User; accessToken: string }> {
  if (isSigningIn) {
    throw new Error('Sign-in already in progress. Please wait.');
  }

  try {
    isSigningIn = true;
    const provider = createGoogleCalendarProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Failed to retrieve OAuth access token for Google Calendar.');
    }

    setCachedAccessToken(token);
    return { user: result.user, accessToken: token };
  } finally {
    isSigningIn = false;
  }
}

/**
 * Fetch calendar events from user's primary calendar
 */
export async function fetchCalendarEvents(timeMin?: string, maxResults: number = 50): Promise<GoogleCalendarEvent[]> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Calendar is not connected. Please connect your Google account.');
  }

  const queryParams = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  });

  if (timeMin) {
    queryParams.set('timeMin', timeMin);
  } else {
    // Default to events from start of current month onwards
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    queryParams.set('timeMin', startOfMonth.toISOString());
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${queryParams.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData?.error?.message || `Failed to fetch events (HTTP ${res.status})`;
    if (
      res.status === 401 ||
      res.status === 403 ||
      message.toLowerCase().includes('scope') ||
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('expired') ||
      message.toLowerCase().includes('insufficient')
    ) {
      setCachedAccessToken(null);
      throw new Error('Google Calendar permission required. Please sign in with Google Calendar to grant access.');
    }
    throw new Error(message);
  }

  const data = await res.json();
  return (data.items || []) as GoogleCalendarEvent[];
}

/**
 * Create a new event on user's primary calendar
 */
export async function createCalendarEvent(eventData: GoogleCalendarEventInput): Promise<GoogleCalendarEvent> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Calendar is not connected. Please connect your Google account.');
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData?.error?.message || `Failed to create calendar event (HTTP ${res.status})`;
    if (
      res.status === 401 ||
      res.status === 403 ||
      message.toLowerCase().includes('scope') ||
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('expired') ||
      message.toLowerCase().includes('insufficient')
    ) {
      setCachedAccessToken(null);
      throw new Error('Google Calendar permission required. Please sign in with Google Calendar to grant access.');
    }
    throw new Error(message);
  }

  return await res.json();
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  eventData: GoogleCalendarEventInput
): Promise<GoogleCalendarEvent> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Calendar is not connected. Please connect your Google account.');
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData?.error?.message || `Failed to update calendar event (HTTP ${res.status})`;
    if (
      res.status === 401 ||
      res.status === 403 ||
      message.toLowerCase().includes('scope') ||
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('expired') ||
      message.toLowerCase().includes('insufficient')
    ) {
      setCachedAccessToken(null);
      throw new Error('Google Calendar permission required. Please sign in with Google Calendar to grant access.');
    }
    throw new Error(message);
  }

  return await res.json();
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Calendar is not connected. Please connect your Google account.');
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204 && res.status !== 410) {
    const errData = await res.json().catch(() => ({}));
    const message = errData?.error?.message || `Failed to delete event (HTTP ${res.status})`;
    if (
      res.status === 401 ||
      res.status === 403 ||
      message.toLowerCase().includes('scope') ||
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('expired') ||
      message.toLowerCase().includes('insufficient')
    ) {
      setCachedAccessToken(null);
      throw new Error('Google Calendar permission required. Please sign in with Google Calendar to grant access.');
    }
    throw new Error(message);
  }

  return true;
}

/**
 * Quick Scheduler: Blood Donation Appointment
 */
export async function scheduleDonationAppointment(details: {
  hospitalName: string;
  hospitalAddress?: string;
  donorName: string;
  bloodGroup: string;
  startDateTime: string; // ISO string or local datetime-local
  durationMinutes?: number;
  notes?: string;
}): Promise<GoogleCalendarEvent> {
  const start = new Date(details.startDateTime);
  const duration = details.durationMinutes || 60;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const eventInput: GoogleCalendarEventInput = {
    summary: `🩸 Blood Donation: ${details.hospitalName} (${details.bloodGroup})`,
    description: [
      `HEMOLINK Emergency Blood Network Appointment`,
      `Donor: ${details.donorName}`,
      `Blood Group: ${details.bloodGroup}`,
      `Location: ${details.hospitalName}`,
      details.hospitalAddress ? `Address: ${details.hospitalAddress}` : '',
      `Notes: Please drink at least 500ml of water and carry your Donor Identity Pass.`,
      details.notes ? `Special Instructions: ${details.notes}` : '',
      `\nCreated via HEMOLINK Emergency Blood Hub`
    ].filter(Boolean).join('\n'),
    location: details.hospitalAddress ? `${details.hospitalName}, ${details.hospitalAddress}` : details.hospitalName,
    start: {
      dateTime: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: '11', // Red color in Google Calendar
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 120 },  // 2 hours before
        { method: 'email', minutes: 1440 }  // 1 day before email reminder
      ]
    }
  };

  return await createCalendarEvent(eventInput);
}

/**
 * Quick Scheduler: 56-Day Cooldown Eligibility Reminder
 */
export async function scheduleEligibilityReminder(details: {
  lastDonationDate: string; // YYYY-MM-DD
  donorName: string;
  bloodGroup: string;
}): Promise<GoogleCalendarEvent> {
  const donationDate = new Date(details.lastDonationDate);
  const COOLDOWN_DAYS = 56;
  const eligibleDate = new Date(donationDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  // Format as YYYY-MM-DD for full-day event
  const eligibleDateStr = eligibleDate.toISOString().split('T')[0];
  const nextDay = new Date(eligibleDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const eventInput: GoogleCalendarEventInput = {
    summary: `🩸 Eligible to Donate Blood Again! (${details.bloodGroup})`,
    description: [
      `HEMOLINK Blood Donation Cooldown Complete!`,
      `Donor: ${details.donorName}`,
      `Blood Group: ${details.bloodGroup}`,
      `Your 56-day post-donation recovery window has concluded. You are now officially cleared and medically eligible to donate blood again and save lives!`,
      `Check the HEMOLINK Emergency Board to find critical patient requisitions nearby.`
    ].join('\n'),
    start: {
      date: eligibleDateStr,
    },
    end: {
      date: nextDay,
    },
    colorId: '10', // Green in Google Calendar
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 540 }, // 9am reminder
        { method: 'email', minutes: 540 }
      ]
    }
  };

  return await createCalendarEvent(eventInput);
}

/**
 * Quick Scheduler: Emergency Blood Request Response / Drive
 */
export async function scheduleEmergencyDrive(details: {
  patientName: string;
  hospitalName: string;
  hospitalAddress?: string;
  bloodGroup: string;
  unitsNeeded: number;
  urgencyLevel: string;
  appointmentDateTime: string;
  notes?: string;
}): Promise<GoogleCalendarEvent> {
  const start = new Date(details.appointmentDateTime);
  const end = new Date(start.getTime() + 90 * 60 * 1000); // 1.5 hours window

  const eventInput: GoogleCalendarEventInput = {
    summary: `🚨 Emergency Blood Donation: ${details.patientName} (${details.bloodGroup})`,
    description: [
      `HEMOLINK Emergency Blood Dispatch`,
      `Patient Name: ${details.patientName}`,
      `Blood Group Needed: ${details.bloodGroup}`,
      `Units: ${details.unitsNeeded} unit(s)`,
      `Urgency Level: ${details.urgencyLevel.toUpperCase()}`,
      `Hospital / Center: ${details.hospitalName}`,
      details.hospitalAddress ? `Address: ${details.hospitalAddress}` : '',
      details.notes ? `Notes: ${details.notes}` : '',
      `\nPlease present your HEMOLINK Donor ID Pass at the hospital reception.`
    ].filter(Boolean).join('\n'),
    location: details.hospitalAddress ? `${details.hospitalName}, ${details.hospitalAddress}` : details.hospitalName,
    start: {
      dateTime: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: '11', // Red in Google Calendar
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 120 }, // 2 hours
        { method: 'popup', minutes: 30 }   // 30 min
      ]
    }
  };

  return await createCalendarEvent(eventInput);
}
