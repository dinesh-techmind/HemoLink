export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type Gender = "Male" | "Female" | "Other";
export type UrgencyLevel = "Critical" | "Urgent" | "Normal";
export type RequestStatus = "Active" | "Fulfilled" | "Expired";
export type UserRole = "user" | "admin";

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Donor {
  uid: string;                    // Matching Firebase Auth UID
  fullName: string;
  email: string;
  phone: string;                  // Only revealed to requesters after accept
  age: number;
  gender: Gender;
  bloodGroup: BloodGroup;
  city: string;
  state: string;
  pincode: string;
  location: GeoLocation;          // Used for Haversine matching
  profilePhotoUrl?: string;       // Avatar or placeholder
  isAvailable: boolean;           // Active status toggle
  lastDonationDate: string | null; // ISO string or null
  donationCount: number;
  createdAt: string;              // ISO String format
  updatedAt: string;              // ISO String format
}

export interface EmergencyRequest {
  requestId: string;
  createdBy: string;              // UID of creator
  requesterName: string;
  requesterPhone: string;
  patientName: string;
  bloodGroupNeeded: BloodGroup;
  unitsNeeded: number;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  state: string;
  location: GeoLocation;
  urgencyLevel: UrgencyLevel;
  additionalNotes: string;
  status: RequestStatus;
  respondedDonors: string[];       // list of Donor UIDs who clicked respond
  createdAt: string;
  expiresAt: string;              // 48 hours relative limit
  shareToken: string;             // WhatsApp token generator link
}

export interface Chat {
  chatId: string;                 // unique combination: "{uid1}_{uid2}_{requestId}" or similar
  participants: string[];         // [donorId, requesterId]
  donorId: string;
  requesterId: string;
  relatedRequestId: string;
  phoneRevealed: boolean;         // Revealed once donor accepts Contact Request
  donorAccepted: boolean;         // Has donor agreed to contact?
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: { [uid: string]: number };
  createdAt: string;
}

export interface Message {
  messageId: string;
  senderId: string;
  text: string;
  timestamp: string;              // ISO String
  read: boolean;
}

export interface ProfileLog {
  id: string;
  donationDate: string;
  location: string;
  notes: string;
  units: number;
}

export interface AppUser {
  uid: string;
  email: string;
  fullName?: string;
  role: UserRole;
  requestsToday: number;
  lastRequestDate?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "SMS" | "Email" | "In-App";
  recipient: string;
  timestamp: string;
  requestId?: string;
  read: boolean;
}
