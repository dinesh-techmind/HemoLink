import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  Heart,
  Droplet,
  Trash2,
  ShieldAlert,
  Send,
  UserCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Share2,
  X,
  Lock,
  ChevronDown
} from 'lucide-react';
import {
  GoogleContact,
  CreateContactInput,
  fetchGoogleContacts,
  createGoogleContact,
  deleteGoogleContact,
  connectGoogleContacts,
  getCachedAccessToken,
  setCachedAccessToken,
  saveContactMetadata,
  generateEmergencyAppealMessage
} from '../lib/google-contacts';
import { AppUser, EmergencyRequest, Donor, BloodGroup } from '../types';
import { store } from '../lib/store';

interface GoogleContactsViewProps {
  currentUser: AppUser | null;
  emergencies: EmergencyRequest[];
  donors: Donor[];
  onDonorCreated?: () => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export default function GoogleContactsView({
  currentUser,
  emergencies,
  donors,
  onDonorCreated
}: GoogleContactsViewProps) {
  const [isConnected, setIsConnected] = useState<boolean>(!!getCachedAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('all');
  const [onlyLifesavers, setOnlyLifesavers] = useState<boolean>(false);
  const [onlyWithPhone, setOnlyWithPhone] = useState<boolean>(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [contactToDelete, setContactToDelete] = useState<GoogleContact | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);

  // Emergency Appeal Modal
  const [appealContact, setAppealContact] = useState<GoogleContact | null>(null);
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string>('');

  // Add Contact Form State
  const [formGivenName, setFormGivenName] = useState<string>('');
  const [formFamilyName, setFormFamilyName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formOrg, setFormOrg] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formBloodGroup, setFormBloodGroup] = useState<BloodGroup | ''>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [showConfirmAddDialog, setShowConfirmAddDialog] = useState<boolean>(false);

  // Quick auto-hide for success alerts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load contacts if already authenticated
  useEffect(() => {
    if (getCachedAccessToken()) {
      setIsConnected(true);
      loadContacts();
    }
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchGoogleContacts();
      setContacts(data);
      setIsConnected(true);
    } catch (err: any) {
      console.error('Error fetching Google Contacts:', err);
      const msg = err.message || 'Failed to load Google Contacts.';
      setError(msg);
      if (
        msg.includes('expired') ||
        msg.includes('permission') ||
        msg.includes('reconnect') ||
        msg.includes('401')
      ) {
        setIsConnected(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await connectGoogleContacts();
      setIsConnected(true);
      setSuccessMessage('Successfully connected to Google Contacts.');
      await loadContacts();
    } catch (err: any) {
      console.error('Error connecting Google Contacts:', err);
      setError(err.message || 'Google Contacts authentication was cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setCachedAccessToken(null);
    setIsConnected(false);
    setContacts([]);
    setSuccessMessage('Disconnected from Google Contacts session.');
  };

  // Toggle Emergency Contact / Lifesaver status
  const handleToggleLifesaver = (contact: GoogleContact) => {
    const nextVal = !contact.isEmergencyContact;
    saveContactMetadata(contact.resourceName, {
      bloodGroup: contact.taggedBloodGroup || undefined,
      isEmergencyContact: nextVal,
      notes: contact.notes
    });

    setContacts((prev) =>
      prev.map((c) =>
        c.resourceName === contact.resourceName ? { ...c, isEmergencyContact: nextVal } : c
      )
    );
  };

  // Change Tagged Blood Group
  const handleBloodGroupChange = (contact: GoogleContact, newBg: string) => {
    const bloodGroup = (newBg === '' ? null : newBg) as BloodGroup | null;
    saveContactMetadata(contact.resourceName, {
      bloodGroup: bloodGroup || undefined,
      isEmergencyContact: contact.isEmergencyContact,
      notes: contact.notes
    });

    setContacts((prev) =>
      prev.map((c) =>
        c.resourceName === contact.resourceName ? { ...c, taggedBloodGroup: bloodGroup } : c
      )
    );
  };

  // Submit Add Contact with explicit user confirmation
  const handleConfirmCreateContact = async () => {
    if (!formGivenName.trim()) {
      setError('Please provide at least a First / Given Name for the contact.');
      return;
    }

    try {
      setIsSubmittingNew(true);
      setError(null);

      const input: CreateContactInput = {
        givenName: formGivenName,
        familyName: formFamilyName,
        email: formEmail,
        phone: formPhone,
        organization: formOrg,
        jobTitle: formTitle,
        bloodGroup: formBloodGroup,
        notes: formNotes
      };

      const created = await createGoogleContact(input);
      setContacts((prev) => [created, ...prev]);
      setSuccessMessage(`Contact "${formGivenName} ${formFamilyName}".trim() added to Google Contacts!`);
      
      // Reset form & close
      setShowConfirmAddDialog(false);
      setIsAddModalOpen(false);
      setFormGivenName('');
      setFormFamilyName('');
      setFormEmail('');
      setFormPhone('');
      setFormOrg('');
      setFormTitle('');
      setFormBloodGroup('');
      setFormNotes('');
    } catch (err: any) {
      console.error('Failed to create Google Contact:', err);
      setError(err.message || 'Failed to save contact to Google Contacts.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Delete Contact with explicit confirmation
  const handleConfirmDeleteContact = async () => {
    if (!contactToDelete) return;
    try {
      setIsDeleting(true);
      setError(null);
      await deleteGoogleContact(contactToDelete.resourceName);
      
      const displayName = contactToDelete.names?.[0]?.displayName || 'Contact';
      setContacts((prev) => prev.filter((c) => c.resourceName !== contactToDelete.resourceName));
      setSuccessMessage(`"${displayName}" was removed from Google Contacts.`);
      setContactToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete Google Contact:', err);
      setError(err.message || 'Could not delete contact from Google Contacts.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Import Contact into Hemolink Donors
  const handleImportToDonors = (contact: GoogleContact) => {
    const displayName = contact.names?.[0]?.displayName || `${contact.names?.[0]?.givenName || ''} ${contact.names?.[0]?.familyName || ''}`.trim() || 'Community Member';
    const email = contact.emailAddresses?.[0]?.value || `contact_${Date.now()}@hemolink.org`;
    const phone = contact.phoneNumbers?.[0]?.value || '+91 98000 00000';
    const bg = contact.taggedBloodGroup || 'O+';

    try {
      store.registerDirectDonor({
        uid: 'donor_' + Math.random().toString(36).substring(2, 9),
        fullName: displayName,
        email: email,
        phone: phone,
        age: 28,
        gender: 'Other',
        bloodGroup: bg,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        location: { lat: 13.0827, lng: 80.2707 },
        isAvailable: true,
        lastDonationDate: null,
        donationCount: 1,
        savedUnits: 1
      });

      if (onDonorCreated) onDonorCreated();
      setSuccessMessage(`"${displayName}" is now registered in the HEMOLINK emergency donor network!`);
    } catch (err: any) {
      setError(err.message || 'Failed to register contact as donor.');
    }
  };

  // Filtered contacts calculation
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const displayName = contact.names?.[0]?.displayName || `${contact.names?.[0]?.givenName || ''} ${contact.names?.[0]?.familyName || ''}`;
      const email = contact.emailAddresses?.map((e) => e.value).join(' ') || '';
      const phone = contact.phoneNumbers?.map((p) => p.value).join(' ') || '';
      const org = contact.organizations?.map((o) => o.name).join(' ') || '';
      const searchTarget = `${displayName} ${email} ${phone} ${org}`.toLowerCase();

      if (searchQuery.trim() && !searchTarget.includes(searchQuery.toLowerCase().trim())) {
        return false;
      }

      if (onlyLifesavers && !contact.isEmergencyContact) {
        return false;
      }

      if (onlyWithPhone && (!contact.phoneNumbers || contact.phoneNumbers.length === 0)) {
        return false;
      }

      if (bloodGroupFilter !== 'all' && contact.taggedBloodGroup !== bloodGroupFilter) {
        return false;
      }

      return true;
    });
  }, [contacts, searchQuery, onlyLifesavers, onlyWithPhone, bloodGroupFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = contacts.length;
    const lifesavers = contacts.filter((c) => c.isEmergencyContact).length;
    const taggedBg = contacts.filter((c) => c.taggedBloodGroup).length;
    const withPhone = contacts.filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0).length;
    return { total, lifesavers, taggedBg, withPhone };
  }, [contacts]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-surface-elevated border border-border-dark rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              <Users className="w-3.5 h-3.5" />
              <span>Google Contacts & Lifesaver Circle</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-text-bright tracking-tight">
              Emergency Contacts & Blood Circle
            </h1>
            <p className="text-sm text-text-muted max-w-2xl">
              Sync your Google Contacts to identify potential blood donors among friends, family, and
              coworkers. Quickly dispatch targeted SOS appeals during life-critical shortages with
              explicit permission.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isConnected ? (
              <>
                <button
                  type="button"
                  id="sync-google-contacts-btn"
                  onClick={loadContacts}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-surface-dark border border-border-dark hover:border-text-subtle text-text-bright text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  title="Reload contacts from Google People API"
                >
                  <RefreshCw className={`w-4 h-4 text-rose-400 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Sync Google Contacts</span>
                </button>

                <button
                  type="button"
                  id="open-add-contact-modal-btn"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-brand-red hover:bg-rose-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-brand-red/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Contact</span>
                </button>

                <button
                  type="button"
                  id="disconnect-google-contacts-btn"
                  onClick={handleDisconnect}
                  className="px-3 py-2.5 rounded-xl bg-surface-dark border border-border-dark text-text-subtle hover:text-rose-400 text-xs font-medium transition cursor-pointer"
                  title="Disconnect Google Contacts session"
                >
                  Disconnect
                </button>
              </>
            ) : (
              /* Official Sign in with Google Button per SKILL.md */
              <button
                type="button"
                id="connect-google-contacts-btn"
                onClick={handleConnectGoogle}
                disabled={isLoading}
                className="gsi-material-button bg-white text-gray-800 hover:bg-gray-50 border border-gray-300 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-3 shadow-md transition cursor-pointer disabled:opacity-60"
              >
                <div className="w-4 h-4 flex-shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span className="font-semibold">{isLoading ? 'Connecting...' : 'Connect Google Contacts'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-500/50 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white p-1"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-white p-1"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {!isConnected ? (
        /* Empty State / Prompt to Connect */
        <div className="bg-surface-card border border-border-dark rounded-2xl p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-bold text-text-bright">Connect Your Google Contacts</h3>
            <p className="text-xs sm:text-sm text-text-muted">
              Connect your Google account to access your personal contacts. Tag friends with their
              known blood types, build an Emergency Lifesaver Circle, and send instant appeals during
              urgent patient blood requests.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              id="connect-google-contacts-hero-btn"
              onClick={handleConnectGoogle}
              disabled={isLoading}
              className="gsi-material-button bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 px-6 py-3 rounded-xl font-semibold text-sm inline-flex items-center gap-3 shadow-lg transition cursor-pointer disabled:opacity-60"
            >
              <div className="w-5 h-5 flex-shrink-0">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              </div>
              <span>{isLoading ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-6 text-left border-t border-border-dark/60 text-xs text-text-subtle">
            <div className="flex items-start gap-2.5">
              <Droplet className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-muted block">Tag Blood Groups</strong>
                Organize family and friends by known ABO/Rh blood groups.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Heart className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-muted block">Emergency Circle</strong>
                Mark priority lifesavers for instant contact during critical situations.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-muted block">Private & Controlled</strong>
                In-memory token access with explicit confirmation before any changes.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface-card border border-border-dark p-4 rounded-xl">
              <div className="text-xs text-text-subtle">Total Contacts</div>
              <div className="text-2xl font-bold text-text-bright mt-1">{stats.total}</div>
              <div className="text-[10px] text-text-muted mt-0.5">from Google Account</div>
            </div>

            <div className="bg-surface-card border border-border-dark p-4 rounded-xl">
              <div className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-400" />
                Lifesaver Circle
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-1">{stats.lifesavers}</div>
              <div className="text-[10px] text-text-muted mt-0.5">Designated Emergency Contacts</div>
            </div>

            <div className="bg-surface-card border border-border-dark p-4 rounded-xl">
              <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 text-amber-400" />
                Tagged Blood Types
              </div>
              <div className="text-2xl font-bold text-amber-300 mt-1">{stats.taggedBg}</div>
              <div className="text-[10px] text-text-muted mt-0.5">Known Blood Donors</div>
            </div>

            <div className="bg-surface-card border border-border-dark p-4 rounded-xl">
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Direct Calling Ready
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.withPhone}</div>
              <div className="text-[10px] text-text-muted mt-0.5">Contacts with Phone #</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-surface-card border border-border-dark p-4 rounded-2xl space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 text-text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="search-google-contacts-input"
                  placeholder="Search contacts by name, email, phone, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface-dark border border-border-dark rounded-xl text-xs text-text-bright placeholder-text-subtle focus:outline-none focus:border-rose-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text-bright text-xs"
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  id="filter-lifesavers-btn"
                  onClick={() => setOnlyLifesavers(!onlyLifesavers)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 border transition cursor-pointer ${
                    onlyLifesavers
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-surface-dark text-text-muted border-border-dark hover:border-text-subtle'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${onlyLifesavers ? 'fill-rose-400 text-rose-400' : ''}`} />
                  <span>Lifesavers Only</span>
                </button>

                <button
                  type="button"
                  id="filter-with-phone-btn"
                  onClick={() => setOnlyWithPhone(!onlyWithPhone)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 border transition cursor-pointer ${
                    onlyWithPhone
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-surface-dark text-text-muted border-border-dark hover:border-text-subtle'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Has Phone</span>
                </button>
              </div>
            </div>

            {/* Blood Group Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-xs border-t border-border-dark/60">
              <span className="text-text-subtle text-[11px] font-medium whitespace-nowrap mr-1">
                Filter by Blood:
              </span>
              <button
                type="button"
                onClick={() => setBloodGroupFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  bloodGroupFilter === 'all'
                    ? 'bg-text-bright text-surface-dark'
                    : 'bg-surface-dark text-text-muted hover:text-text-bright border border-border-dark'
                }`}
              >
                All
              </button>
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBloodGroupFilter(bg)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    bloodGroupFilter === bg
                      ? 'bg-brand-red text-white shadow-md'
                      : 'bg-surface-dark text-text-muted hover:text-text-bright border border-border-dark'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Contacts Grid */}
          {filteredContacts.length === 0 ? (
            <div className="bg-surface-card border border-border-dark rounded-2xl p-12 text-center space-y-3">
              <Users className="w-8 h-8 text-text-subtle mx-auto" />
              <h3 className="text-base font-bold text-text-bright">No Contacts Found</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No Google contacts match your current search and blood group filter criteria.
              </p>
              {(searchQuery || bloodGroupFilter !== 'all' || onlyLifesavers || onlyWithPhone) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setBloodGroupFilter('all');
                    setOnlyLifesavers(false);
                    setOnlyWithPhone(false);
                  }}
                  className="mt-2 text-xs font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact) => {
                const displayName =
                  contact.names?.[0]?.displayName ||
                  `${contact.names?.[0]?.givenName || ''} ${contact.names?.[0]?.familyName || ''}`.trim() ||
                  'Unnamed Contact';
                const photoUrl = contact.photos?.[0]?.url;
                const email = contact.emailAddresses?.[0]?.value;
                const phone = contact.phoneNumbers?.[0]?.value;
                const org = contact.organizations?.[0]?.name;
                const jobTitle = contact.organizations?.[0]?.title;

                return (
                  <div
                    key={contact.resourceName}
                    id={`contact-card-${contact.resourceName.replace(/\//g, '-')}`}
                    className={`bg-surface-card border rounded-2xl p-4 flex flex-col justify-between space-y-4 transition hover:border-text-subtle shadow-md ${
                      contact.isEmergencyContact
                        ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-surface-card'
                        : 'border-border-dark'
                    }`}
                  >
                    {/* Top Row: Avatar, Name, Lifesaver Toggle */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={displayName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover border border-border-dark"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold flex items-center justify-center text-sm">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-text-bright line-clamp-1">{displayName}</h4>
                          </div>
                          {(org || jobTitle) && (
                            <p className="text-[11px] text-text-subtle line-clamp-1 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              <span>{jobTitle ? `${jobTitle}, ${org || ''}` : org}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Lifesaver Star toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleLifesaver(contact)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          contact.isEmergencyContact
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-surface-dark text-text-subtle border-border-dark hover:text-rose-400'
                        }`}
                        title={
                          contact.isEmergencyContact
                            ? 'Starred as Emergency Lifesaver'
                            : 'Mark as Emergency Lifesaver'
                        }
                      >
                        <Heart
                          className={`w-4 h-4 ${contact.isEmergencyContact ? 'fill-rose-400' : ''}`}
                        />
                      </button>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1.5 text-xs text-text-muted bg-surface-dark/70 border border-border-dark/60 rounded-xl p-2.5">
                      {phone ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-text-subtle flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {phone}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${phone}`}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition"
                            >
                              Call
                            </a>
                            <a
                              href={`sms:${phone}`}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition"
                            >
                              SMS
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-text-subtle flex items-center gap-1 italic">
                          <Phone className="w-3 h-3 opacity-40" />
                          <span>No phone number saved</span>
                        </div>
                      )}

                      {email ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-text-subtle truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 text-rose-400" />
                            {email}
                          </span>
                          <a
                            href={`mailto:${email}`}
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-elevated hover:bg-surface-elevated/80 text-text-bright border border-border-dark transition flex-shrink-0"
                          >
                            Email
                          </a>
                        </div>
                      ) : (
                        <div className="text-[11px] text-text-subtle flex items-center gap-1 italic">
                          <Mail className="w-3 h-3 opacity-40" />
                          <span>No email saved</span>
                        </div>
                      )}
                    </div>

                    {/* Blood Group Tagging */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-dark/60 text-xs">
                      <span className="text-[11px] text-text-subtle font-medium flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-brand-red" />
                        Blood Group:
                      </span>
                      <div className="relative inline-block">
                        <select
                          id={`blood-select-${contact.resourceName.replace(/\//g, '-')}`}
                          value={contact.taggedBloodGroup || ''}
                          onChange={(e) => handleBloodGroupChange(contact, e.target.value)}
                          className="bg-surface-dark border border-border-dark hover:border-brand-red/60 text-text-bright rounded-lg px-2 py-1 text-xs font-mono font-bold appearance-none pr-6 cursor-pointer focus:outline-none"
                        >
                          <option value="">Unknown</option>
                          {BLOOD_GROUPS.map((bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-text-subtle absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Emergency Appeal Button */}
                      <button
                        type="button"
                        id={`appeal-btn-${contact.resourceName.replace(/\//g, '-')}`}
                        onClick={() => {
                          setAppealContact(contact);
                          if (emergencies.length > 0) {
                            setSelectedEmergencyId(emergencies[0].requestId);
                          }
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-brand-red/20 to-rose-600/20 hover:from-brand-red/30 hover:to-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Appeal SOS</span>
                      </button>

                      {/* Register as Donor or Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          id={`import-donor-btn-${contact.resourceName.replace(/\//g, '-')}`}
                          onClick={() => handleImportToDonors(contact)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-surface-dark hover:bg-surface-elevated border border-border-dark text-text-bright font-semibold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                          title="Import into HEMOLINK donor roster"
                        >
                          <UserCheck className="w-3 h-3 text-emerald-400" />
                          <span>Add Donor</span>
                        </button>

                        <button
                          type="button"
                          id={`delete-contact-btn-${contact.resourceName.replace(/\//g, '-')}`}
                          onClick={() => setContactToDelete(contact)}
                          className="p-1.5 rounded-xl bg-surface-dark hover:bg-rose-950/40 border border-border-dark hover:border-rose-500/40 text-text-subtle hover:text-rose-400 transition cursor-pointer"
                          title="Delete from Google Contacts"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Add New Contact to Google Contacts Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-card border border-border-dark rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-bright">Add Contact to Google</h3>
                  <p className="text-[11px] text-text-subtle">
                    Creates a real contact in your Google Account via People API
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-text-subtle hover:text-text-bright p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 font-semibold">First Name *</label>
                  <input
                    type="text"
                    id="new-contact-given-name"
                    value={formGivenName}
                    onChange={(e) => setFormGivenName(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-text-bright focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 font-semibold">Last Name</label>
                  <input
                    type="text"
                    id="new-contact-family-name"
                    value={formFamilyName}
                    onChange={(e) => setFormFamilyName(e.target.value)}
                    placeholder="e.g. Kumar"
                    className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-text-bright focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    id="new-contact-phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-text-bright focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 font-semibold">Email Address</label>
                  <input
                    type="email"
                    id="new-contact-email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-text-bright focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-muted mb-1 font-semibold">Organization / Hospital</label>
                  <input
                    type="text"
                    id="new-contact-org"
                    value={formOrg}
                    onChange={(e) => setFormOrg(e.target.value)}
                    placeholder="e.g. Apollo Blood Bank"
                    className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-text-bright focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-text-muted mb-1 font-semibold">Known Blood Group</label>
                  <select
                    id="new-contact-blood-group"
                    value={formBloodGroup}
                    onChange={(e) => setFormBloodGroup(e.target.value as BloodGroup | '')}
                    className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-text-bright font-mono focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Unknown / Not Tested</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-text-muted mb-1 font-semibold">Notes / Relationship</label>
                <input
                  type="text"
                  id="new-contact-notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Regular donor, available on weekends"
                  className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-text-bright focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* MANDATORY Confirmation Step for mutation per SKILL.md */}
            {showConfirmAddDialog ? (
              <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-3 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Confirm Save to Google Contacts</span>
                </div>
                <p className="text-amber-200/90">
                  Are you sure you want to add <strong>{formGivenName} {formFamilyName}</strong> to your
                  personal Google Contacts account?
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmAddDialog(false)}
                    className="px-3 py-1.5 rounded-lg bg-surface-dark text-text-subtle hover:text-text-bright border border-border-dark transition cursor-pointer"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    id="submit-confirm-create-contact-btn"
                    onClick={handleConfirmCreateContact}
                    disabled={isSubmittingNew}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingNew ? 'Saving...' : 'Yes, Create in Google'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-dark text-text-subtle hover:text-text-bright border border-border-dark text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="proceed-create-contact-btn"
                  onClick={() => {
                    if (!formGivenName.trim()) {
                      setError('Please enter a First Name.');
                      return;
                    }
                    setShowConfirmAddDialog(true);
                  }}
                  className="px-5 py-2 rounded-xl bg-brand-red hover:bg-rose-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Review & Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Explicit Delete Confirmation Modal (MANDATORY per SKILL.md) */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-rose-500/50 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-text-bright">Delete Google Contact?</h3>
              <p className="text-xs text-text-muted">
                Are you sure you want to permanently delete{' '}
                <strong className="text-rose-300">
                  {contactToDelete.names?.[0]?.displayName || 'this contact'}
                </strong>{' '}
                from your Google Contacts account? This action cannot be undone.
              </p>
            </div>

            <div className="bg-surface-dark border border-border-dark p-3 rounded-xl text-xs space-y-1 text-text-subtle">
              <div>Resource: {contactToDelete.resourceName}</div>
              {contactToDelete.emailAddresses?.[0]?.value && (
                <div>Email: {contactToDelete.emailAddresses[0].value}</div>
              )}
              {contactToDelete.phoneNumbers?.[0]?.value && (
                <div>Phone: {contactToDelete.phoneNumbers[0].value}</div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-surface-dark text-text-subtle hover:text-text-bright border border-border-dark text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-contact-btn"
                onClick={handleConfirmDeleteContact}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Send SOS Emergency Blood Appeal Modal */}
      {appealContact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card border border-border-dark rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-bright">Emergency Blood Appeal</h3>
                  <p className="text-[11px] text-text-subtle">
                    Personalized plea to {appealContact.names?.[0]?.displayName || 'Contact'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppealContact(null)}
                className="text-text-subtle hover:text-text-bright p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Select Active Emergency Requisition */}
            <div className="space-y-2 text-xs">
              <label className="block text-text-muted font-semibold">
                Select Active Emergency Requisition:
              </label>
              <select
                id="appeal-emergency-select"
                value={selectedEmergencyId}
                onChange={(e) => setSelectedEmergencyId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-dark border border-border-dark rounded-xl text-text-bright text-xs focus:outline-none"
              >
                {emergencies
                  .filter((e) => e.status === 'Active')
                  .map((e) => (
                    <option key={e.requestId} value={e.requestId}>
                      [{e.bloodGroupNeeded}] {e.patientName} at {e.hospitalName} ({e.unitsNeeded} units, {e.urgencyLevel})
                    </option>
                  ))}
              </select>
            </div>

            {/* Pre-composed Message Preview */}
            {(() => {
              const activeReq = emergencies.find((e) => e.requestId === selectedEmergencyId) || emergencies[0];
              const phone = appealContact.phoneNumbers?.[0]?.value || '';
              const contactName = appealContact.names?.[0]?.displayName || 'Lifesaver';
              const message = activeReq
                ? generateEmergencyAppealMessage(
                    contactName,
                    activeReq.bloodGroupNeeded,
                    activeReq.hospitalName,
                    activeReq.city,
                    activeReq.requesterPhone,
                    activeReq.urgencyLevel
                  )
                : `🚨 URGENT BLOOD APPEAL - HEMOLINK\nPlease donate blood if you are eligible!`;

              const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                message
              )}`;
              const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
              const mailUrl = `mailto:${appealContact.emailAddresses?.[0]?.value || ''}?subject=${encodeURIComponent(
                `URGENT: Blood Donation Appeal - ${activeReq?.bloodGroupNeeded || 'Emergency'}`
              )}&body=${encodeURIComponent(message)}`;

              return (
                <div className="space-y-3">
                  <div className="bg-surface-dark border border-border-dark rounded-xl p-3 text-xs font-mono text-text-muted whitespace-pre-line max-h-48 overflow-y-auto">
                    {message}
                  </div>

                  <div className="text-[11px] text-text-subtle">
                    Choose transmission channel to dispatch this appeal:
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {phone ? (
                      <>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        <a
                          href={smsUrl}
                          className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Direct SMS</span>
                        </a>
                      </>
                    ) : null}

                    {appealContact.emailAddresses?.[0]?.value && (
                      <a
                        href={mailUrl}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Email Plea</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAppealContact(null)}
                className="px-4 py-2 rounded-xl bg-surface-dark text-text-subtle hover:text-text-bright border border-border-dark text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
