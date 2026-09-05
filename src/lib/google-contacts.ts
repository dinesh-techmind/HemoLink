import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { BloodGroup } from '../types';

export const WORKSPACE_CONTACTS_SCOPES = [
  // Google Contacts & People Scopes
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
  'https://www.googleapis.com/auth/user.addresses.read',
  'https://www.googleapis.com/auth/user.birthday.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/user.gender.read',
  'https://www.googleapis.com/auth/user.organization.read',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
  // Preserved Google Calendar and Workspace scopes
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.send'
];

export interface GoogleContactName {
  displayName?: string;
  givenName?: string;
  familyName?: string;
  middleName?: string;
  displayNameLastFirst?: string;
}

export interface GoogleContactEmail {
  value: string;
  type?: string;
  formattedType?: string;
  displayName?: string;
}

export interface GoogleContactPhone {
  value: string;
  type?: string;
  formattedType?: string;
  canonicalForm?: string;
}

export interface GoogleContactPhoto {
  url: string;
  default?: boolean;
}

export interface GoogleContactAddress {
  formattedValue?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  type?: string;
}

export interface GoogleContactOrg {
  name?: string;
  title?: string;
  department?: string;
}

export interface GoogleContactUserDefined {
  key: string;
  value: string;
}

export interface GoogleContact {
  resourceName: string; // e.g. "people/c123456789"
  etag: string;
  names?: GoogleContactName[];
  emailAddresses?: GoogleContactEmail[];
  phoneNumbers?: GoogleContactPhone[];
  photos?: GoogleContactPhoto[];
  addresses?: GoogleContactAddress[];
  organizations?: GoogleContactOrg[];
  userDefined?: GoogleContactUserDefined[];
  // Hemolink enriched properties
  taggedBloodGroup?: BloodGroup | null;
  isEmergencyContact?: boolean;
  notes?: string;
}

export interface CreateContactInput {
  givenName: string;
  familyName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
  bloodGroup?: BloodGroup | '';
  notes?: string;
}

// In-memory token storage (MANDATORY per skill guidelines: no localStorage/sessionStorage for token)
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
  if (typeof window !== 'undefined') {
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

export function createGoogleContactsProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  WORKSPACE_CONTACTS_SCOPES.forEach((scope) => {
    provider.addScope(scope);
  });
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline'
  });
  return provider;
}

/**
 * Trigger client-side OAuth popup for Google Contacts
 */
export async function connectGoogleContacts(): Promise<{ user: User; accessToken: string }> {
  if (isSigningIn) {
    throw new Error('Sign-in is already in progress. Please complete the opened window.');
  }

  try {
    isSigningIn = true;
    const provider = createGoogleContactsProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Failed to retrieve OAuth access token for Google Contacts.');
    }

    setCachedAccessToken(token);
    return { user: result.user, accessToken: token };
  } finally {
    isSigningIn = false;
  }
}

// Local storage key for Hemolink blood tags assigned to contacts
const CONTACT_METADATA_STORAGE_KEY = 'hemolink_contacts_metadata_v1';

interface StoredContactMeta {
  bloodGroup?: BloodGroup;
  isEmergencyContact?: boolean;
  notes?: string;
}

export function getStoredContactMetadata(): Record<string, StoredContactMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CONTACT_METADATA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveContactMetadata(resourceName: string, meta: StoredContactMeta) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredContactMetadata();
    existing[resourceName] = { ...existing[resourceName], ...meta };
    localStorage.setItem(CONTACT_METADATA_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to save contact metadata', err);
  }
}

export function removeContactMetadata(resourceName: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredContactMetadata();
    delete existing[resourceName];
    localStorage.setItem(CONTACT_METADATA_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to remove contact metadata', err);
  }
}

/**
 * Fetch contacts using Google People API
 */
export async function fetchGoogleContacts(): Promise<GoogleContact[]> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Contacts is not connected. Please connect your Google account.');
  }

  const personFields = 'names,emailAddresses,phoneNumbers,photos,addresses,organizations,userDefined,biographies,birthdays';
  const url = `https://people.googleapis.com/v1/people/me/connections?personFields=${encodeURIComponent(
    personFields
  )}&pageSize=200&sortOrder=FIRST_NAME_ASCENDING`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData?.error?.message || `Failed to fetch contacts (HTTP ${res.status})`;
    if (
      res.status === 401 ||
      res.status === 403 ||
      message.toLowerCase().includes('scope') ||
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('expired') ||
      message.toLowerCase().includes('insufficient')
    ) {
      setCachedAccessToken(null);
      throw new Error('Google Contacts permission required or session expired. Please reconnect your Google account.');
    }
    throw new Error(message);
  }

  const data = await res.json();
  const rawConnections: any[] = data.connections || [];
  const storedMeta = getStoredContactMetadata();

  const formattedContacts: GoogleContact[] = rawConnections.map((person) => {
    const resourceName = person.resourceName || '';
    const meta = storedMeta[resourceName] || {};

    // Check if userDefined fields in Google contains BloodGroup
    let bloodGroupFromGoogle: BloodGroup | undefined = undefined;
    if (person.userDefined && Array.isArray(person.userDefined)) {
      const bgField = person.userDefined.find(
        (ud: any) => ud.key?.toLowerCase() === 'bloodgroup' || ud.key?.toLowerCase() === 'blood group'
      );
      if (bgField && isValidBloodGroup(bgField.value)) {
        bloodGroupFromGoogle = bgField.value as BloodGroup;
      }
    }

    return {
      resourceName,
      etag: person.etag,
      names: person.names || [],
      emailAddresses: person.emailAddresses || [],
      phoneNumbers: person.phoneNumbers || [],
      photos: person.photos || [],
      addresses: person.addresses || [],
      organizations: person.organizations || [],
      userDefined: person.userDefined || [],
      taggedBloodGroup: meta.bloodGroup || bloodGroupFromGoogle || null,
      isEmergencyContact: meta.isEmergencyContact ?? false,
      notes: meta.notes || ''
    };
  });

  return formattedContacts;
}

function isValidBloodGroup(val: string): boolean {
  return ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(val.trim());
}

/**
 * Create a new contact in Google Contacts (People API)
 * Note: Must be preceded by explicit user confirmation modal.
 */
export async function createGoogleContact(input: CreateContactInput): Promise<GoogleContact> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Contacts is not connected. Please connect your Google account.');
  }

  const payload: any = {
    names: [
      {
        givenName: input.givenName.trim(),
        familyName: input.familyName?.trim() || ''
      }
    ]
  };

  if (input.email?.trim()) {
    payload.emailAddresses = [
      {
        value: input.email.trim(),
        type: 'home'
      }
    ];
  }

  if (input.phone?.trim()) {
    payload.phoneNumbers = [
      {
        value: input.phone.trim(),
        type: 'mobile'
      }
    ];
  }

  if (input.organization?.trim() || input.jobTitle?.trim()) {
    payload.organizations = [
      {
        name: input.organization?.trim() || '',
        title: input.jobTitle?.trim() || ''
      }
    ];
  }

  if (input.bloodGroup) {
    payload.userDefined = [
      {
        key: 'BloodGroup',
        value: input.bloodGroup
      }
    ];
  }

  if (input.notes?.trim()) {
    payload.biographies = [
      {
        value: input.notes.trim(),
        contentType: 'TEXT_PLAIN'
      }
    ];
  }

  const res = await fetch('https://people.googleapis.com/v1/people:createContact?personFields=names,emailAddresses,phoneNumbers,photos,addresses,organizations,userDefined', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to create Google Contact (HTTP ${res.status})`);
  }

  const createdPerson = await res.json();
  const resourceName = createdPerson.resourceName || '';

  if (input.bloodGroup || input.notes) {
    saveContactMetadata(resourceName, {
      bloodGroup: input.bloodGroup ? (input.bloodGroup as BloodGroup) : undefined,
      notes: input.notes || undefined,
      isEmergencyContact: true
    });
  }

  return {
    resourceName,
    etag: createdPerson.etag,
    names: createdPerson.names || [],
    emailAddresses: createdPerson.emailAddresses || [],
    phoneNumbers: createdPerson.phoneNumbers || [],
    photos: createdPerson.photos || [],
    addresses: createdPerson.addresses || [],
    organizations: createdPerson.organizations || [],
    taggedBloodGroup: input.bloodGroup ? (input.bloodGroup as BloodGroup) : null,
    isEmergencyContact: true,
    notes: input.notes || ''
  };
}

/**
 * Delete a contact from Google Contacts (People API)
 * Note: Must be preceded by explicit user confirmation modal.
 */
export async function deleteGoogleContact(resourceName: string): Promise<void> {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Contacts is not connected. Please connect your Google account.');
  }

  // Ensure path is properly formatted e.g. "people/c12345"
  const cleanResourceName = resourceName.startsWith('people/') ? resourceName : `people/${resourceName}`;
  const url = `https://people.googleapis.com/v1/${cleanResourceName}:deleteContact`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok && res.status !== 404) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to delete contact from Google Contacts (HTTP ${res.status})`);
  }

  removeContactMetadata(resourceName);
}

/**
 * Quick helper to craft emergency appeal messages for SMS / WhatsApp / Email
 */
export function generateEmergencyAppealMessage(
  contactName: string,
  bloodGroup: string,
  hospitalName: string,
  city: string,
  contactPhone: string,
  urgency: string = 'Critical'
): string {
  return `🚨 *EMERGENCY BLOOD REQUEST - HEMOLINK* 🚨\n\n` +
    `Hello ${contactName || 'Lifesaver'},\n` +
    `An urgent medical emergency requires blood donation at ${hospitalName} in ${city}.\n\n` +
    `🩸 *Blood Needed:* ${bloodGroup}\n` +
    `⚡ *Urgency:* ${urgency}\n` +
    `📍 *Hospital:* ${hospitalName}, ${city}\n` +
    `📞 *Coordinator Contact:* ${contactPhone}\n\n` +
    `If you or someone you know can donate, please respond immediately. Every second counts.`;
}
