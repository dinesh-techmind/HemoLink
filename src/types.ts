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
  photoURL?: string;              // Synced Google Avatar or profile image
  authProvider?: "phone" | "google" | "both";
  isAvailable: boolean;           // Active status toggle
  lastDonationDate: string | null; // ISO string or null
  donationCount: number;
  savedUnits?: number;            // Total units / lives saved for gamification milestones
  distance?: number;              // Calculated distance in km during directory searches
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
  selectedDonors?: string[];      // Donors selected by admin/requester for notification
  notifiedDonors?: string[];      // Donors who have been sent notifications
  notifiedViaSms?: string[];      // Donors who received SMS on their registered mobile number
  notifiedViaEmail?: string[];    // Donors who received Gmail/Email alert
  acceptedDonorId?: string;       // UID of donor who accepted
  confirmedDonationAt?: string;   // Timestamp when donation was confirmed
  flowStage?: MatchingFlowStage;  // Current stage in smart matching & fulfillment pipeline
  createdAt: string;
  expiresAt: string;              // 48 hours relative limit
  shareToken: string;             // WhatsApp token generator link
}

export type MatchingFlowStage =
  | "request_submitted"
  | "smart_matching"
  | "ranked_donors"
  | "admin_review"
  | "notify_donors"
  | "donor_accepted"
  | "donation_confirmed"
  | "request_fulfilled";

export interface RankedDonorMatch {
  donor: Donor;
  rank: number;
  matchScore: number; // 0 - 100 percentage
  compatibility: {
    compatible: boolean;
    isExact: boolean;
    label: string; // "Exact Match" | "Compatible Group" | "Incompatible"
  };
  distanceKm: number;
  eligibility: {
    isEligible: boolean;
    daysSinceLastDonation: number | null;
    cooldownDaysRemaining: number;
    reason: string;
  };
  scoringBreakdown: {
    bloodScore: number;       // up to 45 pts
    distanceScore: number;    // up to 30 pts
    availabilityScore: number;// up to 15 pts
    reliabilityScore: number; // up to 10 pts
  };
  matchBadges: string[];
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
  phone?: string;
  fullName?: string;
  photoURL?: string;
  authProvider?: "phone" | "google" | "both";
  role: UserRole;
  requestsToday: number;
  lastRequestDate?: string;
  createdAt: string;
}

export interface AccountRecoveryRequest {
  id: string;
  fullName: string;
  previousPhone: string;
  newPhone: string;
  bloodGroup?: BloodGroup;
  city?: string;
  registeredEmail?: string;
  additionalDetails?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
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

export interface AdminAuditLog {
  id: string;
  action: string;           // e.g. "Donor Removed", "SOS Fulfilled", "User Removed", "SOS Deleted"
  details: string;          // Human-readable explanation of target/context
  targetId?: string;        // ID of entity affected
  adminId: string;          // Admin's UID or identifier
  adminEmail: string;       // Admin's email for clear accountability
  timestamp: string;        // ISO format string
}

export interface SmsLogEntry {
  id: string;
  donorUid: string;
  donorName: string;
  donorPhone: string;
  message: string;
  templateType?: string;
  requestId?: string;
  status: "Delivered" | "Sent" | "Failed";
  carrier: string;
  timestamp: string;
  referenceId: string;
}
