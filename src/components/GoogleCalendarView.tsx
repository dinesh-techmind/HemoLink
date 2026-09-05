import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Heart,
  Droplet,
  ShieldCheck,
  CalendarCheck,
  Sparkles,
  Info,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';
import {
  GoogleCalendarEvent,
  GoogleCalendarEventInput,
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  connectGoogleCalendar,
  getCachedAccessToken,
  scheduleDonationAppointment,
  scheduleEligibilityReminder,
  setCachedAccessToken
} from '../lib/google-calendar';
import { AppUser, EmergencyRequest, Donor } from '../types';

interface GoogleCalendarViewProps {
  currentUser: AppUser | null;
  emergencies: EmergencyRequest[];
  donors: Donor[];
}

export default function GoogleCalendarView({
  currentUser,
  emergencies,
  donors
}: GoogleCalendarViewProps) {
  const [isConnected, setIsConnected] = useState<boolean>(!!getCachedAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'blood' | 'eligibility'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<GoogleCalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<GoogleCalendarEvent | null>(null);
  const [pendingUpdateInput, setPendingUpdateInput] = useState<{ eventId: string; input: GoogleCalendarEventInput; originalTitle: string } | null>(null);

  // Event Form State
  const [formSummary, setFormSummary] = useState<string>('');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('10:00');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formEndTime, setFormEndTime] = useState<string>('11:00');
  const [formColorId, setFormColorId] = useState<string>('11'); // 11 = Flamingo/Red

  // Check current donor profile
  const currentDonor = donors.find(
    (d) => d.email.toLowerCase() === currentUser?.email?.toLowerCase()
  );

  // Load events if already connected
  useEffect(() => {
    const token = getCachedAccessToken();
    if (token) {
      setIsConnected(true);
      loadEvents();
    }
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const items = await fetchCalendarEvents();
      setEvents(items);
    } catch (err: any) {
      console.error('Error fetching calendar events:', err);
      const msg = err.message || 'Failed to load Google Calendar events.';
      setError(msg);
      if (
        msg.includes('expired') ||
        msg.includes('not connected') ||
        msg.includes('permission') ||
        msg.includes('scope') ||
        msg.includes('insufficient')
      ) {
        setIsConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await connectGoogleCalendar();
      setIsConnected(true);
      setSuccessMessage('Successfully connected to Google Calendar!');
      await loadEvents();
    } catch (err: any) {
      console.error('Google Calendar connection error:', err);
      setError(err.message || 'Failed to connect Google Calendar.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModalWithPreset = (preset: 'standard' | 'donation' | 'eligibility') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'donation') {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setFormSummary(`🩸 Blood Donation Appointment - ${currentDonor?.bloodGroup || 'Blood'} Bank`);
      setFormLocation(currentDonor?.city ? `${currentDonor.city} Central Blood Bank` : 'City Blood Center');
      setFormDescription(
        `HEMOLINK Scheduled Donation\nDonor: ${currentUser?.fullName || 'Donor'}\nBlood Group: ${currentDonor?.bloodGroup || 'O+'}\nReminders: Drink 500ml water beforehand and carry your Donor Identity Pass.`
      );
      setFormStartDate(tomorrowStr);
      setFormStartTime('10:00');
      setFormEndDate(tomorrowStr);
      setFormEndTime('11:30');
      setFormColorId('11');
    } else if (preset === 'eligibility') {
      const targetDate = new Date(today.getTime() + 56 * 24 * 60 * 60 * 1000);
      const targetStr = targetDate.toISOString().split('T')[0];
      setFormSummary(`🩸 Cleared: 56-Day Blood Donation Eligibility`);
      setFormLocation('HEMOLINK Network');
      setFormDescription(
        `Your 56-day blood donation cooldown period has completed! You are medically eligible to donate blood again and help save lives.`
      );
      setFormStartDate(targetStr);
      setFormStartTime('09:00');
      setFormEndDate(targetStr);
      setFormEndTime('10:00');
      setFormColorId('10'); // Green
    } else {
      setFormSummary('🩸 Medical Appointment / Blood Drive');
      setFormLocation('');
      setFormDescription('HEMOLINK Event');
      setFormStartDate(todayStr);
      setFormStartTime('14:00');
      setFormEndDate(todayStr);
      setFormEndTime('15:00');
      setFormColorId('11');
    }

    setEditingEvent(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (event: GoogleCalendarEvent) => {
    setEditingEvent(event);
    setFormSummary(event.summary || '');
    setFormLocation(event.location || '');
    setFormDescription(event.description || '');
    setFormColorId(event.colorId || '11');

    if (event.start?.dateTime) {
      const startD = new Date(event.start.dateTime);
      setFormStartDate(startD.toISOString().split('T')[0]);
      setFormStartTime(startD.toTimeString().slice(0, 5));
    } else if (event.start?.date) {
      setFormStartDate(event.start.date);
      setFormStartTime('09:00');
    }

    if (event.end?.dateTime) {
      const endD = new Date(event.end.dateTime);
      setFormEndDate(endD.toISOString().split('T')[0]);
      setFormEndTime(endD.toTimeString().slice(0, 5));
    } else if (event.end?.date) {
      setFormEndDate(event.end.date);
      setFormEndTime('10:00');
    }

    setIsCreateModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSummary.trim() || !formStartDate) {
      setError('Please provide an event title and valid start date.');
      return;
    }

    const startDateTimeStr = `${formStartDate}T${formStartTime || '09:00'}:00`;
    const endDateTimeStr = `${formEndDate || formStartDate}T${formEndTime || '10:00'}:00`;

    const startIso = new Date(startDateTimeStr).toISOString();
    const endIso = new Date(endDateTimeStr).toISOString();

    const inputData: GoogleCalendarEventInput = {
      summary: formSummary.trim(),
      location: formLocation.trim() || undefined,
      description: formDescription.trim() || undefined,
      start: {
        dateTime: startIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: formColorId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 },
          { method: 'popup', minutes: 120 }
        ]
      }
    };

    if (editingEvent) {
      // Skill Mandate: Require explicit user confirmation dialog before mutating external user data!
      setIsCreateModalOpen(false);
      setPendingUpdateInput({
        eventId: editingEvent.id,
        input: inputData,
        originalTitle: editingEvent.summary
      });
      return;
    }

    // Creating new event
    try {
      setIsLoading(true);
      setError(null);
      await createCalendarEvent(inputData);
      setSuccessMessage(`Successfully added "${inputData.summary}" to Google Calendar!`);
      setIsCreateModalOpen(false);
      await loadEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to create calendar event.');
    } finally {
      setIsLoading(false);
    }
  };

  // Explicit confirmation for updating an existing event
  const confirmUpdateEvent = async () => {
    if (!pendingUpdateInput) return;
    try {
      setIsLoading(true);
      setError(null);
      await updateCalendarEvent(pendingUpdateInput.eventId, pendingUpdateInput.input);
      setSuccessMessage(`Updated "${pendingUpdateInput.input.summary}" on Google Calendar!`);
      setPendingUpdateInput(null);
      setEditingEvent(null);
      await loadEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to update calendar event.');
    } finally {
      setIsLoading(false);
    }
  };

  // Explicit confirmation for deleting an event
  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      setIsLoading(true);
      setError(null);
      await deleteCalendarEvent(eventToDelete.id);
      setSuccessMessage(`Deleted "${eventToDelete.summary}" from Google Calendar.`);
      setEventToDelete(null);
      await loadEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Sync Next Eligibility to Google Calendar
  const handleSyncEligibilityReminder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const lastDonated = currentDonor?.lastDonationDate || '2024-01-01';
      await scheduleEligibilityReminder({
        lastDonationDate: lastDonated,
        donorName: currentUser?.fullName || 'Donor',
        bloodGroup: currentDonor?.bloodGroup || 'O+'
      });
      setSuccessMessage('56-day blood donation recovery milestone added to your Google Calendar!');
      await loadEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to sync donation reminder.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter events
  const filteredEvents = events.filter((ev) => {
    const summary = (ev.summary || '').toLowerCase();
    const desc = (ev.description || '').toLowerCase();
    const loc = (ev.location || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query || summary.includes(query) || desc.includes(query) || loc.includes(query);

    if (!matchesSearch) return false;

    if (categoryFilter === 'blood') {
      return (
        summary.includes('blood') ||
        summary.includes('donation') ||
        summary.includes('hemolink') ||
        summary.includes('drive') ||
        desc.includes('blood')
      );
    }
    if (categoryFilter === 'eligibility') {
      return (
        summary.includes('eligib') ||
        summary.includes('cooldown') ||
        summary.includes('cleared') ||
        desc.includes('56-day')
      );
    }

    return true;
  });

  const formatEventDate = (event: GoogleCalendarEvent) => {
    const startVal = event.start?.dateTime || event.start?.date;
    if (!startVal) return 'Date not specified';

    const date = new Date(startVal);
    const dateFormatted = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    if (event.start?.dateTime) {
      const timeFormatted = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${dateFormatted} at ${timeFormatted}`;
    }

    return `${dateFormatted} (All-day)`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-card-dark border border-border-dark rounded-2xl p-6 relative overflow-hidden shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs font-bold uppercase tracking-wider">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Google Calendar Integration</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-bright tracking-tight font-display">
              Donation Schedules & Calendar Hub
            </h2>
            <p className="text-text-muted text-sm max-w-2xl leading-relaxed">
              Seamlessly synchronize your blood donation appointments, 56-day eligibility countdowns, and emergency drives directly with your personal Google Calendar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isConnected ? (
              <>
                <button
                  id="btn-refresh-calendar"
                  onClick={loadEvents}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-surface-dark border border-border-dark text-text-bright hover:bg-surface-dark/80 transition cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-red' : ''}`} />
                  <span>Sync Events</span>
                </button>
                <button
                  id="btn-create-calendar-event"
                  onClick={() => openCreateModalWithPreset('donation')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-red text-white hover:bg-brand-red/90 transition shadow-lg shadow-brand-red/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Schedule Appointment</span>
                </button>
              </>
            ) : (
              /* Official Google Sign-in button style from skill instructions */
              <button
                id="btn-google-calendar-signin"
                onClick={handleConnect}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold px-5 py-2.5 rounded-xl border border-gray-300 shadow-md hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? 'Connecting...' : 'Sign in with Google Calendar'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-400 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-300">Calendar Notification</p>
              <p className="mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {!isConnected && (
              <button
                id="btn-reconnect-google-calendar"
                onClick={handleConnect}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-brand-red text-white hover:bg-brand-red/90 rounded-lg font-bold text-xs transition cursor-pointer shadow-sm"
              >
                Sign in with Google Calendar
              </button>
            )}
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3 text-emerald-400 text-xs">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm text-emerald-300">Success</p>
            <p className="mt-1">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Action Panels for Blood Donors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Action 1: Schedule Donation */}
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 flex flex-col justify-between hover:border-brand-red/40 transition">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center font-bold">
              <Droplet className="w-5 h-5 fill-brand-red" />
            </div>
            <h3 className="font-bold text-text-bright text-sm">Schedule Blood Donation</h3>
            <p className="text-text-muted text-xs leading-relaxed">
              Book your next voluntary blood bank appointment with built-in reminders 24 hours prior.
            </p>
          </div>
          <button
            onClick={() => openCreateModalWithPreset('donation')}
            disabled={!isConnected}
            className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
              isConnected
                ? 'bg-brand-red/15 text-brand-red hover:bg-brand-red hover:text-white cursor-pointer'
                : 'bg-surface-dark text-text-muted cursor-not-allowed opacity-50'
            }`}
          >
            <span>Book Appointment</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Action 2: 56-Day Cooldown Milestone */}
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text-bright text-sm">56-Day Eligibility Milestone</h3>
            <p className="text-text-muted text-xs leading-relaxed">
              Automatically calculate and mark the exact day you are cleared to donate blood again.
            </p>
          </div>
          <button
            onClick={handleSyncEligibilityReminder}
            disabled={!isConnected || isLoading}
            className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white cursor-pointer'
                : 'bg-surface-dark text-text-muted cursor-not-allowed opacity-50'
            }`}
          >
            <span>Sync Eligibility Date</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Action 3: Emergency Drive sync */}
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-text-bright text-sm">Custom Medical Reminders</h3>
            <p className="text-text-muted text-xs leading-relaxed">
              Add custom blood drive events, platelet appointments, or donor drive coordinator shifts.
            </p>
          </div>
          <button
            onClick={() => openCreateModalWithPreset('standard')}
            disabled={!isConnected}
            className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
              isConnected
                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-white cursor-pointer'
                : 'bg-surface-dark text-text-muted cursor-not-allowed opacity-50'
            }`}
          >
            <span>Custom Event</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Events Container */}
      <div className="bg-card-dark border border-border-dark rounded-2xl p-6 space-y-6">
        {/* Controls Bar: Filter & Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-dark pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-brand-red text-white'
                  : 'bg-surface-dark text-text-muted hover:text-text-bright'
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              onClick={() => setCategoryFilter('blood')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'blood'
                  ? 'bg-brand-red text-white'
                  : 'bg-surface-dark text-text-muted hover:text-text-bright'
              }`}
            >
              <Droplet className="w-3 h-3 text-brand-red" />
              <span>Blood Donations</span>
            </button>
            <button
              onClick={() => setCategoryFilter('eligibility')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'eligibility'
                  ? 'bg-brand-red text-white'
                  : 'bg-surface-dark text-text-muted hover:text-text-bright'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Eligibility Reminders</span>
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search calendar events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-surface-dark border border-border-dark text-xs text-text-bright placeholder:text-text-muted focus:outline-none focus:border-brand-red"
            />
          </div>
        </div>

        {/* Not connected placeholder */}
        {!isConnected ? (
          <div className="text-center py-16 px-4 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-surface-dark border border-border-dark flex items-center justify-center mx-auto text-brand-red shadow-inner">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-text-bright">Connect Your Google Calendar</h3>
              <p className="text-text-muted text-xs leading-relaxed">
                Connect your Google account to sync live appointment reminders, hospital locations, and track your clinical donation timeline directly in Google Calendar.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold px-6 py-3 rounded-xl border border-gray-300 shadow-md hover:bg-gray-50 active:bg-gray-100 transition cursor-pointer text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? 'Connecting...' : 'Authorize Google Calendar'}</span>
              </button>
            </div>
          </div>
        ) : isLoading && events.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-brand-red animate-spin mx-auto" />
            <p className="text-text-muted text-xs font-semibold">Synchronizing with Google Calendar...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <CalendarIcon className="w-10 h-10 text-text-muted mx-auto opacity-40" />
            <h4 className="text-text-bright font-bold text-sm">No Events Found</h4>
            <p className="text-text-muted text-xs max-w-sm mx-auto">
              No matching events found on your Google Calendar. You can schedule a new blood donation appointment or sync your 56-day milestone above!
            </p>
            <button
              onClick={() => openCreateModalWithPreset('donation')}
              className="mt-2 px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl hover:bg-brand-red/90 transition cursor-pointer"
            >
              Schedule First Appointment
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map((event) => {
              const isBloodRelated =
                (event.summary || '').toLowerCase().includes('blood') ||
                (event.summary || '').toLowerCase().includes('hemolink') ||
                (event.summary || '').toLowerCase().includes('donation');

              const isEligibility =
                (event.summary || '').toLowerCase().includes('eligib') ||
                (event.summary || '').toLowerCase().includes('cooldown');

              return (
                <div
                  key={event.id}
                  className={`bg-surface-dark border rounded-xl p-4.5 flex flex-col justify-between transition hover:shadow-md ${
                    isEligibility
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : isBloodRelated
                      ? 'border-brand-red/30 bg-brand-red/5'
                      : 'border-border-dark'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isEligibility ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                        ) : isBloodRelated ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-red shrink-0"></span>
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0"></span>
                        )}
                        <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-text-muted">
                          {isEligibility
                            ? 'ELIGIBILITY MILESTONE'
                            : isBloodRelated
                            ? 'BLOOD NETWORK EVENT'
                            : 'GOOGLE CALENDAR'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {event.htmlLink && (
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-text-muted hover:text-text-bright rounded hover:bg-card-dark transition"
                            title="Open in Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => openEditModal(event)}
                          className="p-1 text-text-muted hover:text-amber-400 rounded hover:bg-card-dark transition cursor-pointer"
                          title="Edit Event"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEventToDelete(event)}
                          className="p-1 text-text-muted hover:text-rose-400 rounded hover:bg-card-dark transition cursor-pointer"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-text-bright leading-snug">
                      {event.summary || 'Untitled Event'}
                    </h4>

                    <div className="space-y-1.5 text-xs text-text-muted">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-brand-red shrink-0" />
                        <span>{formatEventDate(event)}</span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-[11px] text-text-muted/90 line-clamp-2 leading-relaxed bg-card-dark/60 p-2 rounded-lg border border-border-dark/50">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-border-dark/50 flex items-center justify-between text-[11px] text-text-muted">
                    <span className="font-mono text-[10px]">ID: {event.id.slice(0, 10)}...</span>
                    {event.htmlLink && (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-red hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>Google Calendar</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Create / Edit Event Modal                                          */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card-dark border border-border-dark rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border-dark flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-red/10 text-brand-red flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-bright">
                    {editingEvent ? 'Edit Calendar Event' : 'Schedule on Google Calendar'}
                  </h3>
                  <p className="text-text-muted text-xs">
                    {editingEvent
                      ? 'Modify details on your Google Calendar'
                      : 'Creates an appointment directly in your primary Google Calendar'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-text-muted hover:text-text-bright p-1 rounded-lg hover:bg-surface-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-bright">Event Title / Summary</label>
                <input
                  type="text"
                  required
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="e.g. Blood Donation Appointment"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-dark border border-border-dark text-xs text-text-bright focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-bright">Hospital / Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Apollo Hospital Blood Bank, Greams Road"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-dark border border-border-dark text-xs text-text-bright focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-bright">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-border-dark text-xs text-text-bright focus:outline-none focus:border-brand-red"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-bright">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-border-dark text-xs text-text-bright focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-bright">End Date</label>
                  <input
                    type="date"
                    required
                    value={formEndDate || formStartDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-border-dark text-xs text-text-bright focus:outline-none focus:border-brand-red"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-bright">End Time</label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-dark border border-border-dark text-xs text-text-bright focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-bright">Description & Clinical Notes</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Notes on donor eligibility, fasting status, contact details..."
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-dark border border-border-dark text-xs text-text-bright focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-border-dark">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-dark text-text-muted hover:text-text-bright transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-red text-white hover:bg-brand-red/90 transition shadow-lg shadow-brand-red/20 cursor-pointer"
                >
                  {isLoading ? 'Saving...' : editingEvent ? 'Review Changes' : 'Save to Google Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANDATORY CONFIRMATION MODAL: Update / Mutation Confirmation              */}
      {/* ========================================================================= */}
      {pendingUpdateInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card-dark border border-amber-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-bright">Confirm Calendar Event Update</h3>
                <p className="text-text-muted text-xs">Verify changes before updating Google Calendar</p>
              </div>
            </div>

            <div className="bg-surface-dark border border-border-dark rounded-xl p-3.5 text-xs space-y-2">
              <div>
                <span className="text-text-muted text-[10px] uppercase font-mono block">Original Title</span>
                <span className="font-semibold text-text-bright">{pendingUpdateInput.originalTitle}</span>
              </div>
              <div className="border-t border-border-dark pt-2">
                <span className="text-text-muted text-[10px] uppercase font-mono block">Updated Title</span>
                <span className="font-semibold text-amber-400">{pendingUpdateInput.input.summary}</span>
              </div>
              {pendingUpdateInput.input.location && (
                <div className="border-t border-border-dark pt-2">
                  <span className="text-text-muted text-[10px] uppercase font-mono block">Location</span>
                  <span className="text-text-bright">{pendingUpdateInput.input.location}</span>
                </div>
              )}
            </div>

            <p className="text-text-muted text-xs leading-relaxed">
              This action will update the event on your primary Google Calendar and notify any invited attendees.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPendingUpdateInput(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-dark text-text-muted hover:text-text-bright transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdateEvent}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition cursor-pointer"
              >
                {isLoading ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANDATORY CONFIRMATION MODAL: Destructive Delete Confirmation             */}
      {/* ========================================================================= */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card-dark border border-rose-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-bright">Permanently Delete Event?</h3>
                <p className="text-text-muted text-xs">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-surface-dark border border-border-dark rounded-xl p-3.5 text-xs space-y-1.5">
              <span className="text-text-muted text-[10px] uppercase font-mono block">Event to be removed</span>
              <p className="font-bold text-text-bright">{eventToDelete.summary}</p>
              <p className="text-text-muted text-[11px]">{formatEventDate(eventToDelete)}</p>
              {eventToDelete.location && (
                <p className="text-text-muted text-[11px]">📍 {eventToDelete.location}</p>
              )}
            </div>

            <p className="text-rose-400/90 text-xs leading-relaxed">
              Are you sure you want to permanently delete this event from your Google Calendar?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-dark text-text-muted hover:text-text-bright transition"
              >
                Keep Event
              </button>
              <button
                onClick={confirmDeleteEvent}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition cursor-pointer"
              >
                {isLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
