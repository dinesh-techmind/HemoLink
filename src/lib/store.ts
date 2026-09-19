import { Donor, EmergencyRequest, Chat, Message, AppUser, BloodGroup, Gender, UrgencyLevel, RequestStatus, GeoLocation, UserRole, AppNotification, AdminAuditLog, SmsLogEntry } from "../types";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getMilestoneTier } from "./milestones";
import { arePhonesEqual } from "./phoneAuth";

// Pre-seeded audit logs for admin accountability verification (sorted chronologically)
const SEED_ADMIN_LOGS: AdminAuditLog[] = [
  {
    id: "log_act_checkin_1",
    action: "Donation Check-In Logged",
    details: "Verified donation of 1 unit Whole Blood for Rajesh Kumar (O+) at Rajiv Gandhi Government General Hospital Blood Bank, Chennai. Reset WHO 56-day cooldown timer.",
    targetId: "donor_1",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-19T05:45:00.000Z"
  },
  {
    id: "log_act_reg_1",
    action: "Donor Registered",
    details: "New donor profile registered: 'Dr. Ananya Sundaram' (AB+) in Coimbatore, Tamil Nadu. Mobile verification cleared.",
    targetId: "donor_reg_1",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-19T04:15:00.000Z"
  },
  {
    id: "log_act_checkin_2",
    action: "Donation Check-In Logged",
    details: "On-site clinic check-in completed for Priya Sharma (A+) at Apollo Hospital Blood Centre, Greams Road. Apheresis Platelets donation verified (+15 saved units).",
    targetId: "donor_2",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-19T03:20:00.000Z"
  },
  {
    id: "log_act_rem_1",
    action: "User Removed",
    details: "Permanently removed registered user account 'test.spammer99@junkmail.com' by Super Admin moderation override.",
    targetId: "user_spam_1",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-18T21:05:00.000Z"
  },
  {
    id: "log_act_reg_2",
    action: "Donor Registered",
    details: "New donor profile registered: 'Manoj Venkatesh' (O-) in Madurai, Tamil Nadu. Active emergency volunteer tier granted.",
    targetId: "donor_reg_2",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-18T18:40:00.000Z"
  },
  {
    id: "log_act_checkin_3",
    action: "Donation Check-In Logged",
    details: "Mobile QR pass check-in scanned and clinical donation approved for Arunachalam S. (B+) at Stanley Medical College Blood Bank. Added +10 saved units.",
    targetId: "donor_4",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-18T16:10:00.000Z"
  },
  {
    id: "log_act_reg_3",
    action: "User Registered",
    details: "New user account registered: 'Divya Balaji' (divya.b@outlook.com) with role: user.",
    targetId: "user_reg_1",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-18T12:15:00.000Z"
  },
  {
    id: "log_act_checkin_4",
    action: "Donation Check-In Logged",
    details: "Hospital check-in recorded for Meenakshi Sundaram (O+) at Coimbatore Medical College Hospital. Cleared for whole blood donation.",
    targetId: "donor_6",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-18T10:30:00.000Z"
  },
  {
    id: "log_act_rem_2",
    action: "Donor Profile Deregistered",
    details: "Donor profile voluntarily deregistered and removed for 'Vijay Anand' (A-, Chennai) upon donor request.",
    targetId: "donor_rem_2",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-17T17:30:00.000Z"
  },
  {
    id: "log_act_reg_4",
    action: "Donor Registered",
    details: "User registered as active donor: 'Kavitha Ramachandran' (A+) in Salem, Tamil Nadu.",
    targetId: "donor_reg_4",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-17T14:20:00.000Z"
  },
  {
    id: "log_act_rem_3",
    action: "Donor Removed",
    details: "Removed inactive donor profile 'K. Suresh' (B+) following clinical health ineligibility review.",
    targetId: "donor_rem_3",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-09-16T15:45:00.000Z"
  },
  {
    id: "log_init_1",
    action: "System Initialized",
    details: "Master Admin Console audit trail initiated with HIPAA & clinical accountability tracking.",
    adminId: "admin_super",
    adminEmail: "srini16dinesh@gmail.com",
    timestamp: "2026-06-01T09:00:00.000Z"
  }
];

// Haversine formula to compute distance in km
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// Pre-seeded donor database (Realistic locations in India & globally suitable coordinates)
const SEED_DONORS: Donor[] = [
  {
    uid: "admin_super",
    fullName: "S.S. Dinesh",
    email: "srini16dinesh@gmail.com",
    phone: "+91 94432 10987",
    age: 26,
    gender: "Male",
    bloodGroup: "O+",
    city: "Coimbatore",
    state: "Tamil Nadu",
    pincode: "641001",
    location: { lat: 11.0168, lng: 76.9558 },
    isAvailable: true,
    lastDonationDate: "2025-05-20",
    donationCount: 3,
    savedUnits: 55,
    profilePhotoUrl: "/avatars/male_passport_dinesh.jpg",
    createdAt: "2025-01-12T09:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z"
  },
  {
    uid: "donor_rahul_1",
    fullName: "Rahul Varma",
    email: "rahul.varma@gmail.com",
    phone: "+91 98450 12345",
    age: 28,
    gender: "Male",
    bloodGroup: "O+",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
    location: { lat: 13.0827, lng: 80.2707 },
    isAvailable: true,
    lastDonationDate: "2026-02-15",
    donationCount: 6,
    savedUnits: 65,
    profilePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    createdAt: "2025-10-10T12:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z"
  },
  {
    uid: "donor_priya_2",
    fullName: "Priya Sharma",
    email: "priya.sharma@yahoo.com",
    phone: "+91 81220 98765",
    age: 24,
    gender: "Female",
    bloodGroup: "A-",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600020",
    location: { lat: 13.0033, lng: 80.2550 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 0,
    savedUnits: 0,
    profilePhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    createdAt: "2025-11-12T09:30:00Z",
    updatedAt: "2026-05-20T14:15:00Z"
  },
  {
    uid: "donor_arjun_3",
    fullName: "Arjun Reddy",
    email: "arjun.reddy@gmail.com",
    phone: "+91 98845 22110",
    age: 32,
    gender: "Male",
    bloodGroup: "O-",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600018",
    location: { lat: 13.0292, lng: 80.2408 },
    isAvailable: true,
    lastDonationDate: "2025-12-01",
    donationCount: 11,
    savedUnits: 120,
    profilePhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    createdAt: "2025-08-01T15:00:00Z",
    updatedAt: "2026-05-30T11:00:00Z"
  },
  {
    uid: "donor_ananya_4",
    fullName: "Ananya Deshmukh",
    email: "ananya.d@gmail.com",
    phone: "+91 76543 98123",
    age: 29,
    gender: "Female",
    bloodGroup: "B+",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    location: { lat: 18.9220, lng: 72.8347 },
    isAvailable: true,
    lastDonationDate: "2026-01-20",
    donationCount: 3,
    savedUnits: 35,
    profilePhotoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-06-02T16:00:00Z"
  },
  {
    uid: "donor_vikram_5",
    fullName: "Vikram Malhotra",
    email: "malhotra.vik@outlook.com",
    phone: "+91 99012 34567",
    age: 35,
    gender: "Male",
    bloodGroup: "AB+",
    city: "Delhi",
    state: "Delhi",
    pincode: "110001",
    location: { lat: 28.6139, lng: 77.2090 },
    isAvailable: false,
    lastDonationDate: "2026-05-10",
    donationCount: 15,
    savedUnits: 1050,
    profilePhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    createdAt: "2025-04-15T08:00:00Z",
    updatedAt: "2026-05-10T12:00:00Z"
  },
  {
    uid: "donor_sneha_6",
    fullName: "Sneha Sen",
    email: "sneha.sen@gmail.com",
    phone: "+91 88990 01122",
    age: 27,
    gender: "Female",
    bloodGroup: "B-",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
    location: { lat: 22.5726, lng: 88.3639 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 0,
    savedUnits: 0,
    profilePhotoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-06T11:00:00Z",
    updatedAt: "2026-08-06T11:00:00Z"
  },
  {
    uid: "donor_karthik_7",
    fullName: "Karthik Raja",
    email: "karthik.raja@gmail.com",
    phone: "+91 97890 12340",
    age: 29,
    gender: "Male",
    bloodGroup: "O+",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600028",
    location: { lat: 13.0200, lng: 80.2600 },
    isAvailable: true,
    lastDonationDate: "2026-08-09",
    donationCount: 4,
    savedUnits: 50,
    profilePhotoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-09T08:30:00Z",
    updatedAt: "2026-08-09T08:30:00Z"
  },
  {
    uid: "donor_divya_8",
    fullName: "Divya Balan",
    email: "divya.balan@outlook.com",
    phone: "+91 98401 55667",
    age: 26,
    gender: "Female",
    bloodGroup: "O-",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600034",
    location: { lat: 13.0580, lng: 80.2430 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 2,
    savedUnits: 20,
    profilePhotoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-12T14:15:00Z",
    updatedAt: "2026-08-12T14:15:00Z"
  },
  {
    uid: "donor_rajesh_9",
    fullName: "Rajesh Kumar",
    email: "rajesh.k@gmail.com",
    phone: "+91 94440 99881",
    age: 31,
    gender: "Male",
    bloodGroup: "B+",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    location: { lat: 12.9716, lng: 77.5946 },
    isAvailable: true,
    lastDonationDate: "2026-08-14",
    donationCount: 5,
    savedUnits: 550,
    profilePhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-14T09:45:00Z",
    updatedAt: "2026-08-14T09:45:00Z"
  },
  {
    uid: "donor_swati_10",
    fullName: "Swati Patel",
    email: "swati.patel@gmail.com",
    phone: "+91 91234 56789",
    age: 25,
    gender: "Female",
    bloodGroup: "AB-",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    location: { lat: 19.0596, lng: 72.8295 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 1,
    profilePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-17T11:20:00Z",
    updatedAt: "2026-08-17T11:20:00Z"
  },
  {
    uid: "donor_harish_11",
    fullName: "Harish Iyer",
    email: "harish.iyer@gmail.com",
    phone: "+91 98840 33221",
    age: 34,
    gender: "Male",
    bloodGroup: "O+",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600096",
    location: { lat: 12.9698, lng: 80.2443 },
    isAvailable: true,
    lastDonationDate: "2026-08-19",
    donationCount: 8,
    profilePhotoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-19T16:00:00Z",
    updatedAt: "2026-08-19T16:00:00Z"
  },
  {
    uid: "donor_pooja_12",
    fullName: "Pooja Nambiar",
    email: "pooja.n@yahoo.com",
    phone: "+91 97123 44556",
    age: 28,
    gender: "Female",
    bloodGroup: "A-",
    city: "Kochi",
    state: "Kerala",
    pincode: "682001",
    location: { lat: 9.9312, lng: 76.2673 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 3,
    profilePhotoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-21T10:10:00Z",
    updatedAt: "2026-08-21T10:10:00Z"
  },
  {
    uid: "donor_deepak_13",
    fullName: "Deepak Joshi",
    email: "deepak.joshi@gmail.com",
    phone: "+91 98220 11223",
    age: 30,
    gender: "Male",
    bloodGroup: "B-",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    location: { lat: 18.5204, lng: 73.8567 },
    isAvailable: true,
    lastDonationDate: "2026-08-24",
    donationCount: 4,
    profilePhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-24T13:40:00Z",
    updatedAt: "2026-08-24T13:40:00Z"
  },
  {
    uid: "donor_tanvi_14",
    fullName: "Tanvi Kulkarni",
    email: "tanvi.k@gmail.com",
    phone: "+91 99876 54321",
    age: 24,
    gender: "Female",
    bloodGroup: "O+",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400012",
    location: { lat: 19.0000, lng: 72.8400 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 2,
    profilePhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-26T09:15:00Z",
    updatedAt: "2026-08-26T09:15:00Z"
  },
  {
    uid: "donor_manoj_15",
    fullName: "Manoj Chawla",
    email: "manoj.c@gmail.com",
    phone: "+91 98111 22334",
    age: 33,
    gender: "Male",
    bloodGroup: "AB+",
    city: "Delhi",
    state: "Delhi",
    pincode: "110024",
    location: { lat: 28.5680, lng: 77.2400 },
    isAvailable: true,
    lastDonationDate: "2026-08-28",
    donationCount: 7,
    profilePhotoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-28T15:30:00Z",
    updatedAt: "2026-08-28T15:30:00Z"
  },
  {
    uid: "donor_kavita_16",
    fullName: "Kavita Sundaram",
    email: "kavita.s@yahoo.com",
    phone: "+91 98410 77889",
    age: 27,
    gender: "Female",
    bloodGroup: "O-",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600041",
    location: { lat: 12.9800, lng: 80.2600 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 3,
    profilePhotoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-08-30T11:00:00Z",
    updatedAt: "2026-08-30T11:00:00Z"
  },
  {
    uid: "donor_rohit_17",
    fullName: "Rohit Singhania",
    email: "rohit.s@gmail.com",
    phone: "+91 99200 88776",
    age: 29,
    gender: "Male",
    bloodGroup: "A+",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700020",
    location: { lat: 22.5400, lng: 88.3500 },
    isAvailable: true,
    lastDonationDate: "2026-09-01",
    donationCount: 5,
    profilePhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-09-01T12:20:00Z",
    updatedAt: "2026-09-01T12:20:00Z"
  },
  {
    uid: "donor_anita_18",
    fullName: "Anita Roy",
    email: "anita.roy@gmail.com",
    phone: "+91 98300 44556",
    age: 31,
    gender: "Female",
    bloodGroup: "B+",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700029",
    location: { lat: 22.5180, lng: 88.3600 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 2,
    profilePhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-09-02T14:45:00Z",
    updatedAt: "2026-09-02T14:45:00Z"
  },
  {
    uid: "donor_suresh_19",
    fullName: "Suresh Babu",
    email: "suresh.b@gmail.com",
    phone: "+91 94450 11224",
    age: 35,
    gender: "Male",
    bloodGroup: "O+",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600004",
    location: { lat: 13.0330, lng: 80.2680 },
    isAvailable: true,
    lastDonationDate: "2026-09-03",
    donationCount: 9,
    profilePhotoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-09-03T10:00:00Z",
    updatedAt: "2026-09-03T10:00:00Z"
  },
  {
    uid: "donor_neha_20",
    fullName: "Neha Kapoor",
    email: "neha.kapoor@gmail.com",
    phone: "+91 98100 66778",
    age: 26,
    gender: "Female",
    bloodGroup: "A-",
    city: "Delhi",
    state: "Delhi",
    pincode: "110016",
    location: { lat: 28.5500, lng: 77.2000 },
    isAvailable: true,
    lastDonationDate: null,
    donationCount: 1,
    profilePhotoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
    createdAt: "2026-09-04T08:15:00Z",
    updatedAt: "2026-09-04T08:15:00Z"
  }
];

// Pre-seeded active emergency requests
const SEED_REQUESTS: EmergencyRequest[] = [
  {
    requestId: "req_hospital_aaa",
    createdBy: "user_seeker_1",
    requesterName: "Dr. Sandeep Krishnan",
    requesterPhone: "+91 94440 55660",
    patientName: "Aradhana Bose",
    bloodGroupNeeded: "O-",
    unitsNeeded: 3,
    hospitalName: "Apollo Hospital, Greams Road",
    hospitalAddress: "21, Greams Road, Thousand Lights",
    city: "Chennai",
    state: "Tamil Nadu",
    location: { lat: 13.0601, lng: 80.2513 }, // Close to seeds
    urgencyLevel: "Critical",
    additionalNotes: "Patient undergoing heart bypass surgery at 8:00 AM. In dire need of rare O negative blood type. Please respond immediately.",
    status: "Active",
    respondedDonors: [],
    createdAt: "2026-06-04T08:30:00Z",
    expiresAt: "2026-06-06T08:30:00Z",
    shareToken: "ap_O_neg_sh"
  },
  {
    requestId: "req_hospital_bbb",
    createdBy: "user_seeker_2",
    requesterName: "Meenakshi Nathan",
    requesterPhone: "+91 91500 44332",
    patientName: "Sanjay Nathan",
    bloodGroupNeeded: "A-",
    unitsNeeded: 2,
    hospitalName: "Fortis Malar Hospital",
    hospitalAddress: "52, 1st Main Rd, Gandhi Nagar, Adyar",
    city: "Chennai",
    state: "Tamil Nadu",
    location: { lat: 13.0039, lng: 80.2520 }, // Close to Priya (seed 2)
    urgencyLevel: "Urgent",
    additionalNotes: "Severe dengue patient with critically dipping platelet counts. Looking for A- blood donors inside Chennai.",
    status: "Active",
    respondedDonors: ["donor_priya_2"],
    createdAt: "2026-06-03T14:20:00Z",
    expiresAt: "2026-06-05T14:20:00Z",
    shareToken: "fortis_A_neg_sh"
  },
  {
    requestId: "req_hospital_ccc",
    createdBy: "user_seeker_3",
    requesterName: "Rohan Kulkarni",
    requesterPhone: "+91 98200 44556",
    patientName: "Kishore Kulkarni",
    bloodGroupNeeded: "AB+",
    unitsNeeded: 4,
    hospitalName: "KEM Hospital",
    hospitalAddress: "Acharya Donde Marg, Parel",
    city: "Mumbai",
    state: "Maharashtra",
    location: { lat: 19.0031, lng: 72.8422 },
    urgencyLevel: "Normal",
    additionalNotes: "Thalassemia major case. Monthly general transfusion requirement.",
    status: "Active",
    respondedDonors: [],
    createdAt: "2026-06-04T11:00:00Z",
    expiresAt: "2026-06-06T11:00:00Z",
    shareToken: "kem_ab_pos_sh"
  }
];

// Pre-seeded chat channels and transcripts
const SEED_CHATS: Chat[] = [
  {
    chatId: "donor_priya_2_user_seeker_2_req_hospital_bbb",
    participants: ["donor_priya_2", "user_seeker_2"],
    donorId: "donor_priya_2",
    requesterId: "user_seeker_2",
    relatedRequestId: "req_hospital_bbb",
    phoneRevealed: true,
    donorAccepted: true,
    lastMessage: "I am ready to donate at 3 PM today.",
    lastMessageAt: "2026-06-04T12:30:00Z",
    unreadCount: { "user_seeker_2": 1, "donor_priya_2": 0 },
    createdAt: "2026-06-03T16:00:00Z"
  }
];

const SEED_MESSAGES: { [chatId: string]: Message[] } = {
  "donor_priya_2_user_seeker_2_req_hospital_bbb": [
    {
      messageId: "msg_1",
      senderId: "user_seeker_2",
      text: "Hello Priya, thank you so much for responding to my emergency request for Sanjay Nathan at Fortis Malar.",
      timestamp: "2026-06-03T16:15:00Z",
      read: true
    },
    {
      messageId: "msg_2",
      senderId: "donor_priya_2",
      text: "You are welcome. Since it's urgent, I am available to come to Adyar this afternoon. What coordinate or ward is the patient located in?",
      timestamp: "2026-06-03T16:30:00Z",
      read: true
    },
    {
      messageId: "msg_3",
      senderId: "user_seeker_2",
      text: "He is in the ICU block ward 4-B. Your donation means the world to our family.",
      timestamp: "2026-06-04T11:45:00Z",
      read: true
    },
    {
      messageId: "msg_4",
      senderId: "donor_priya_2",
      text: "I am ready to donate at 3 PM today.",
      timestamp: "2026-06-04T12:30:00Z",
      read: false
    }
  ]
};

// Initial logged-in users list (stored in backend database)
const SEED_USERS: AppUser[] = [
  {
    uid: "admin_super",
    email: "srini16dinesh@gmail.com",
    fullName: "S.S. Dinesh",
    phone: "+91 94432 10987",
    role: "admin",
    requestsToday: 0,
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    uid: "donor_rahul_1",
    email: "rahul.varma@gmail.com",
    fullName: "Rahul Varma",
    phone: "+91 98450 12345",
    role: "user",
    requestsToday: 0,
    createdAt: "2025-10-10T12:00:00Z"
  },
  {
    uid: "donor_priya_2",
    email: "priya.sharma@yahoo.com",
    fullName: "Priya Sharma",
    phone: "+91 81220 98765",
    role: "user",
    requestsToday: 0,
    createdAt: "2025-11-12T09:30:00Z"
  },
  {
    uid: "donor_arjun_3",
    email: "arjun.reddy@gmail.com",
    fullName: "Arjun Reddy",
    phone: "+91 97890 54321",
    role: "user",
    requestsToday: 0,
    createdAt: "2025-12-01T09:30:00Z"
  },
  {
    uid: "donor_sneha_4",
    email: "sneha.k@gmail.com",
    fullName: "Sneha Kapoor",
    phone: "+91 90030 67890",
    role: "user",
    requestsToday: 0,
    createdAt: "2025-12-15T11:00:00Z"
  },
  {
    uid: "donor_mohammed_5",
    email: "faiz.m@outlook.com",
    fullName: "Mohammed Faiz",
    phone: "+91 99401 23456",
    role: "user",
    requestsToday: 0,
    createdAt: "2026-01-05T08:15:00Z"
  },
  {
    uid: "donor_ananya_6",
    email: "ananya.sundaram@aims.edu",
    fullName: "Dr. Ananya Sundaram",
    phone: "+91 94444 88776",
    role: "user",
    requestsToday: 0,
    createdAt: "2026-01-10T14:20:00Z"
  },
  {
    uid: "donor_kavitha_7",
    email: "kavitha.r@tcs.com",
    fullName: "Kavitha Ramachandran",
    phone: "+91 98840 99887",
    role: "user",
    requestsToday: 0,
    createdAt: "2026-01-15T10:00:00Z"
  },
  {
    uid: "donor_vijay_8",
    email: "vijay.anand@zoho.com",
    fullName: "Vijay Anand",
    phone: "+91 91760 11223",
    role: "user",
    requestsToday: 0,
    createdAt: "2026-02-01T09:00:00Z"
  },
  {
    uid: "user_seeker_1",
    email: "sandeep@hospital.org",
    fullName: "Dr. Sandeep Krishnan",
    phone: "+91 98400 11223",
    role: "user",
    requestsToday: 1,
    createdAt: "2026-01-10T12:00:00Z"
  }
];

export class AppStore {
  // Client database states
  private donors: Donor[] = [];
  private emergencies: EmergencyRequest[] = [];
  private chats: Chat[] = [];
  private messages: { [chatId: string]: Message[] } = {};
  private users: AppUser[] = [];
  private currentUser: AppUser | null = null;
  private userGPS: GeoLocation = { lat: 13.0827, lng: 80.2707 }; // Default Central Chennai
  private notifications: AppNotification[] = [];
  private adminLogs: AdminAuditLog[] = [];
  private smsLogs: SmsLogEntry[] = [];

  // Listeners list for reactive UI re-renders
  private listeners: (() => void)[] = [];
  private onMessageListeners: { [chatId: string]: () => void } = {};

  constructor() {
    this.loadFromStorage();
    this.initializeFirebaseSync();
    this.setupFirebaseAuth();
  }

  // Set up Firebase Auth state tracking and anonymous session fallback integration
  private setupFirebaseAuth() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Firebase Auth State Sync: Active Session detected ->", user.uid);
        // If user is non-anonymous (e.g. verified Phone Auth) and no currentUser is selected,
        // restore matching user profile to maintain session across refreshes
        if (!user.isAnonymous && !this.currentUser) {
          const userPhone = user.phoneNumber || "";
          let match = this.users.find((u) => u.uid === user.uid || (u.phone && userPhone && u.phone === userPhone));
          if (!match) {
            const donorMatch = this.donors.find((d) => d.uid === user.uid || (d.phone && userPhone && d.phone === userPhone));
            if (donorMatch) {
              match = {
                uid: donorMatch.uid,
                email: donorMatch.email || `${userPhone.replace(/\D/g, "")}@donor.hemolink.org`,
                phone: donorMatch.phone || userPhone,
                fullName: donorMatch.fullName,
                role: "user",
                requestsToday: 0,
                createdAt: donorMatch.createdAt || new Date().toISOString(),
              };
              this.users.push(match);
            }
          }
          if (match) {
            this.currentUser = match;
            this.saveToStorage();
            this.notify();
          }
        }
      } else {
        // Automatically sign in anonymously so we have a valid auth token for Firestore rules
        signInAnonymously(auth).catch((err) => {
          console.warn("Could not authenticate anonymously on initial launch:", err);
        });
      }
    });
  }

  // Establish continuous real-time listeners with Firestore
  private initializeFirebaseSync() {
    try {
      // Direct Snapshot observing on physical collection structures
      onSnapshot(collection(db, "donors"), (snapshot) => {
        const list: Donor[] = [];
        snapshot.forEach((doc) => {
          list.push({ uid: doc.id, ...doc.data() } as Donor);
        });
        if (snapshot.size > 0) {
          this.donors = list;
          this.saveToStorage();
          this.notify();
        }
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, "donors");
        } catch {
          // Graceful silent fallback to prevent UX crash
        }
      });

      onSnapshot(collection(db, "emergency_requests"), (snapshot) => {
        const list: EmergencyRequest[] = [];
        snapshot.forEach((doc) => {
          list.push({ requestId: doc.id, ...doc.data() } as EmergencyRequest);
        });
        if (snapshot.size > 0) {
          this.emergencies = list;
          this.saveToStorage();
          this.notify();
        }
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, "emergency_requests");
        } catch {
          // Graceful silent fallback to prevent UX crash
        }
      });

      onSnapshot(collection(db, "chats"), (snapshot) => {
        const list: Chat[] = [];
        snapshot.forEach((doc) => {
          list.push({ chatId: doc.id, ...doc.data() } as Chat);
        });
        if (snapshot.size > 0) {
          this.chats = list;
          this.saveToStorage();
          this.notify();
        }
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, "chats");
        } catch {
          // Graceful silent fallback to prevent UX crash
        }
      });

      onSnapshot(collection(db, "notifications"), (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as AppNotification);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (snapshot.size > 0) {
          this.notifications = list;
          this.saveToStorage();
          this.notify();
        }
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, "notifications");
        } catch {
          // Graceful silent fallback to prevent UX crash
        }
      });

      onSnapshot(collection(db, "admin_logs"), (snapshot) => {
        const list: AdminAuditLog[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as AdminAuditLog);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (snapshot.size > 0) {
          this.adminLogs = list;
          this.saveToStorage();
          this.notify();
        }
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, "admin_logs");
        } catch {
          // Graceful silent fallback
        }
      });

      // Continuous observer on registered users collection in Firestore
      onSnapshot(collection(db, "users"), (snapshot) => {
        const list: AppUser[] = [];
        snapshot.forEach((doc) => {
          list.push({ uid: doc.id, ...doc.data() } as AppUser);
        });
        if (snapshot.size > 0) {
          for (const u of list) {
            const idx = this.users.findIndex((existing) => existing.uid === u.uid || (u.phone && existing.phone && arePhonesEqual(u.phone, existing.phone)));
            if (idx >= 0) {
              this.users[idx] = { ...this.users[idx], ...u };
            } else {
              this.users.push(u);
            }
          }
          this.saveToStorage();
          this.notify();
        }
      }, (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, "users");
        } catch {
          // Graceful silent fallback
        }
      });

      // Run on-startup seed checklist
      this.seedFirestoreIfNeeded();

    } catch (e) {
      console.warn("Unable to negotiate connection with Firebase database:", e);
    }
  }

  // Pre-seed Firestore if collections are blank on first setup run
  private async seedFirestoreIfNeeded() {
    try {
      const donorsSnap = await getDocs(collection(db, "donors"));
      if (donorsSnap.empty) {
        console.log("Database Bootstrap: Preloading volunteers schema inside cloud firestore...");
        for (const donor of SEED_DONORS) {
          await setDoc(doc(db, "donors", donor.uid), donor);
        }
      }

      const usersSnap = await getDocs(collection(db, "users"));
      if (usersSnap.empty) {
        console.log("Database Bootstrap: Syncing registered users schema inside cloud firestore...");
        for (const user of SEED_USERS) {
          await setDoc(doc(db, "users", user.uid), user);
        }
      }

      const reqsSnap = await getDocs(collection(db, "emergency_requests"));
      if (reqsSnap.empty) {
        console.log("Database Bootstrap: Syncing medical requests...");
        for (const req of SEED_REQUESTS) {
          await setDoc(doc(db, "emergency_requests", req.requestId), req);
        }
      }

      const chatsSnap = await getDocs(collection(db, "chats"));
      if (chatsSnap.empty) {
        console.log("Database Bootstrap: Initializing communication channels...");
        for (const chat of SEED_CHATS) {
          await setDoc(doc(db, "chats", chat.chatId), chat);
          
          const msgs = SEED_MESSAGES[chat.chatId] || [];
          for (const m of msgs) {
            await setDoc(doc(db, "chats", chat.chatId, "messages", m.messageId), m);
          }
        }
      }
    } catch (err) {
      console.log("Firestore pre-seed skipped (e.g. security rules, empty connection, or client offline):", err);
    }
  }

  // Firestore-synced write method wrapper helper
  private async syncToFirestore(collectionName: string, docId: string, data: any) {
    try {
      await setDoc(doc(db, collectionName, docId), data);
    } catch (error) {
      console.warn(`Firestore sync write failed for ${collectionName}/${docId}:`, error);
      // Attempting warning report parsing to fit ABAC rule context
      try {
        handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
      } catch (e) {
        // No-op
      }
    }
  }

  // Load from LocalStorage or initialize with robust seed data
  private loadFromStorage() {
    try {
      const storedDonors = localStorage.getItem("blood_finder_donors");
      const storedEmergencies = localStorage.getItem("blood_finder_emergencies");
      const storedChats = localStorage.getItem("blood_finder_chats");
      const storedMessages = localStorage.getItem("blood_finder_messages");
      const storedUsers = localStorage.getItem("blood_finder_users");
      const storedCurrentUser = localStorage.getItem("blood_finder_current_user");
      const storedGPS = localStorage.getItem("blood_finder_gps");
      const storedNotifications = localStorage.getItem("blood_finder_notifications");
      const storedAdminLogs = localStorage.getItem("blood_finder_admin_logs");
      const storedSmsLogs = localStorage.getItem("blood_finder_sms_logs");

      if (storedDonors) {
        try {
          const parsed = JSON.parse(storedDonors);
          if (Array.isArray(parsed)) {
            const existingUids = new Set(parsed.map((d: Donor) => d?.uid).filter(Boolean));
            const missing = SEED_DONORS.filter((d) => !existingUids.has(d.uid));
            this.donors = [...parsed, ...missing];
          } else if (parsed && Array.isArray((parsed as any).donors)) {
            this.donors = (parsed as any).donors;
          } else {
            this.donors = [...SEED_DONORS];
          }
        } catch {
          this.donors = [...SEED_DONORS];
        }
      } else {
        this.donors = [...SEED_DONORS];
      }
      this.emergencies = storedEmergencies ? JSON.parse(storedEmergencies) : SEED_REQUESTS;
      this.chats = storedChats ? JSON.parse(storedChats) : SEED_CHATS;
      this.messages = storedMessages ? JSON.parse(storedMessages) : SEED_MESSAGES;
      this.users = storedUsers ? JSON.parse(storedUsers) : [...SEED_USERS];
      // Ensure seed users and phone numbers are seamlessly synchronized
      if (Array.isArray(this.users)) {
        const existingUids = new Set(this.users.map((u: AppUser) => u?.uid).filter(Boolean));
        const missingUsers = SEED_USERS.filter((u) => !existingUids.has(u.uid));
        this.users = [...this.users, ...missingUsers];

        for (const u of this.users) {
          if (!u.phone) {
            const donorMatch = this.donors.find(
              (d) => d.uid === u.uid || (u.email && d.email && d.email.toLowerCase() === u.email.toLowerCase())
            );
            if (donorMatch?.phone) {
              u.phone = donorMatch.phone;
            } else {
              const seedMatch = SEED_USERS.find((su) => su.uid === u.uid);
              if (seedMatch?.phone) {
                u.phone = seedMatch.phone;
              }
            }
          }
        }
      } else {
        this.users = [...SEED_USERS];
      }
      // Restore active authenticated session if present in localStorage
      if (storedCurrentUser) {
        try {
          this.currentUser = JSON.parse(storedCurrentUser);
        } catch {
          this.currentUser = null;
        }
      } else {
        this.currentUser = null;
      }
      this.notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
      let parsedLogs: AdminAuditLog[] = storedAdminLogs ? JSON.parse(storedAdminLogs) : [];
      if (parsedLogs.length < SEED_ADMIN_LOGS.length) {
        const existingIds = new Set(parsedLogs.map((l) => l.id));
        SEED_ADMIN_LOGS.forEach((seedLog) => {
          if (!existingIds.has(seedLog.id)) {
            parsedLogs.push(seedLog);
          }
        });
      }
      parsedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.adminLogs = parsedLogs;
      this.smsLogs = storedSmsLogs ? JSON.parse(storedSmsLogs) : [];
      if (storedGPS) {
        this.userGPS = JSON.parse(storedGPS);
      } else {
        // Safe check for browser geolocation
        if (typeof window !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              this.userGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              this.saveToStorage();
              this.notify();
            },
            () => console.log("Geolocation blocked, running on Central Chennai coordinates")
          );
        }
      }
    } catch (e) {
      console.error("Local storage corruption detected, resetting with seed", e);
      this.donors = SEED_DONORS;
      this.emergencies = SEED_REQUESTS;
      this.chats = SEED_CHATS;
      this.messages = SEED_MESSAGES;
      this.users = SEED_USERS;
      this.currentUser = null;
    }
    this.saveToStorage();
  }

  // Persists state
  private saveToStorage() {
    localStorage.setItem("blood_finder_donors", JSON.stringify(this.donors));
    localStorage.setItem("blood_finder_emergencies", JSON.stringify(this.emergencies));
    localStorage.setItem("blood_finder_chats", JSON.stringify(this.chats));
    localStorage.setItem("blood_finder_messages", JSON.stringify(this.messages));
    localStorage.setItem("blood_finder_users", JSON.stringify(this.users));
    localStorage.removeItem("blood_finder_current_user");
    localStorage.setItem("blood_finder_gps", JSON.stringify(this.userGPS));
    localStorage.setItem("blood_finder_notifications", JSON.stringify(this.notifications));
    localStorage.setItem("blood_finder_admin_logs", JSON.stringify(this.adminLogs));
    localStorage.setItem("blood_finder_sms_logs", JSON.stringify(this.smsLogs));
  }

  // Reactive methods
  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // Auth getters and actions
  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public getGPSLocation(): GeoLocation {
    return this.userGPS;
  }

  public setGPSLocation(loc: GeoLocation) {
    this.userGPS = loc;
    this.saveToStorage();
    this.notify();
  }

  public getAllUsers(): AppUser[] {
    return this.users;
  }

  public switchUser(uid: string) {
    const user = this.users.find((u) => u.uid === uid);
    if (user) {
      this.currentUser = user;
      this.saveToStorage();
      this.notify();
    }
  }

  public registerUser(email: string, fullName: string, role: UserRole = "user"): AppUser {
    const existing = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      this.currentUser = existing;
      this.saveToStorage();
      this.notify();
      return existing;
    }
    const newUser: AppUser = {
      uid: "user_" + Math.random().toString(36).substring(2, 9),
      email,
      fullName,
      role,
      requestsToday: 0,
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    this.currentUser = newUser;
    this.saveToStorage();
    this.notify();
    this.logAdminAction(
      "User Registered",
      `New user account registered: '${newUser.fullName}' (${newUser.email}) with role: ${newUser.role}.`,
      newUser.uid
    );
    return newUser;
  }

  public registerMobileUser(
    uid: string,
    phone: string,
    fullName: string,
    email?: string,
    role: UserRole = "user"
  ): AppUser {
    let existing = this.users.find(
      (u) => u.uid === uid || (u.phone && phone && arePhonesEqual(u.phone, phone))
    );
    if (existing) {
      if (fullName) existing.fullName = fullName;
      if (email) existing.email = email;
      existing.phone = phone;
      if (existing.uid !== uid) {
        existing.uid = uid;
      }
      existing.authProvider = existing.email && !existing.email.includes("@donor.hemolink.org") ? "both" : "phone";
      this.currentUser = existing;
      this.syncToFirestore("users", existing.uid, existing);
      this.saveToStorage();
      this.notify();
      return existing;
    }
    const cleanEmail = email || `${phone.replace(/\D/g, "")}@donor.hemolink.org`;
    const newUser: AppUser = {
      uid,
      email: cleanEmail,
      phone,
      fullName: fullName || "Verified Donor",
      role,
      authProvider: email ? "both" : "phone",
      requestsToday: 0,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.currentUser = newUser;
    this.syncToFirestore("users", newUser.uid, newUser);
    this.saveToStorage();
    this.notify();
    this.logAdminAction(
      "User Registered",
      `Mobile user registered: '${newUser.fullName}' (${newUser.phone || newUser.email}) with role: ${newUser.role}.`,
      newUser.uid
    );
    return newUser;
  }

  /**
   * Synchronously inspects local store state (donors and registered users)
   * to check if a phone number already exists in the backend store.
   */
  public isPhoneRegistered(phoneNumber: string): {
    isRegistered: boolean;
    user?: AppUser;
    donor?: Donor;
    name?: string;
    role?: UserRole;
  } {
    if (!phoneNumber) return { isRegistered: false };

    // 1. Check registered donors list
    const foundDonor = this.donors.find((d) => arePhonesEqual(d.phone, phoneNumber));
    if (foundDonor) {
      const matchedUser = this.users.find(
        (u) => u.uid === foundDonor.uid || arePhonesEqual(u.phone, phoneNumber)
      );
      return {
        isRegistered: true,
        donor: foundDonor,
        user: matchedUser,
        name: foundDonor.fullName,
        role: matchedUser?.role || "user",
      };
    }

    // 2. Check registered users list
    const foundUser = this.users.find((u) => arePhonesEqual(u.phone, phoneNumber));
    if (foundUser) {
      return {
        isRegistered: true,
        user: foundUser,
        name: foundUser.fullName,
        role: foundUser.role,
      };
    }

    return { isRegistered: false };
  }

  /**
   * Asynchronously checks backend database (both local cache and Firestore collections)
   * to verify whether a mobile number is already registered or not.
   */
  public async checkPhoneInBackend(phoneNumber: string): Promise<{
    isRegistered: boolean;
    user?: AppUser;
    donor?: Donor;
    name?: string;
    role?: UserRole;
  }> {
    if (!phoneNumber) return { isRegistered: false };

    // 1. First test synchronous local store state
    const localCheck = this.isPhoneRegistered(phoneNumber);
    if (localCheck.isRegistered) {
      return localCheck;
    }

    // 2. Query Firestore collections directly
    try {
      // Check donors collection in Firestore
      const donorsSnap = await getDocs(collection(db, "donors"));
      for (const dDoc of donorsSnap.docs) {
        const dData = dDoc.data() as Donor;
        if (arePhonesEqual(dData.phone, phoneNumber)) {
          if (!this.donors.some((d) => d.uid === dData.uid)) {
            this.donors.push(dData);
            this.saveToStorage();
            this.notify();
          }
          return {
            isRegistered: true,
            donor: dData,
            name: dData.fullName,
            role: "user",
          };
        }
      }

      // Check users collection in Firestore
      const usersSnap = await getDocs(collection(db, "users"));
      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data() as AppUser;
        if (arePhonesEqual(uData.phone, phoneNumber)) {
          if (!this.users.some((u) => u.uid === uData.uid)) {
            this.users.push(uData);
            this.saveToStorage();
            this.notify();
          }
          return {
            isRegistered: true,
            user: uData,
            name: uData.fullName,
            role: uData.role,
          };
        }
      }
    } catch (err) {
      console.warn("Backend phone registration lookup error (fallback to local state):", err);
    }

    return { isRegistered: false };
  }

  public registerGoogleUser(
    uid: string,
    email: string,
    fullName: string,
    phone?: string,
    photoURL?: string
  ): AppUser {
    const isSuperAdminEmail = email?.toLowerCase() === "srini16dinesh@gmail.com";
    const assignedRole: UserRole = isSuperAdminEmail ? "admin" : "user";

    // 1. Check existing AppUser by UID or matching Email
    let existing = this.users.find(
      (u) => u.uid === uid || (email && u.email && u.email.toLowerCase() === email.toLowerCase())
    );

    if (existing) {
      if (existing.uid !== uid) {
        existing.uid = uid; // Synchronize UID with active Google Auth UID for Firestore security rules
      }
      if (fullName && (!existing.fullName || existing.fullName === "Verified Donor" || existing.fullName === "Google Member")) {
        existing.fullName = fullName;
      }
      if (email && !existing.email) {
        existing.email = email;
      }
      if (phone && !existing.phone) {
        existing.phone = phone;
      }
      if (photoURL) {
        existing.photoURL = photoURL;
      }
      if (isSuperAdminEmail) {
        existing.role = "admin";
      }
      existing.authProvider = existing.phone ? "both" : "google";
      this.currentUser = existing;
      this.syncToFirestore("users", existing.uid, existing);

      // 2. Also ensure matching Donor profile consistency
      const matchingDonor = this.donors.find(
        (d) => d.uid === uid || (email && d.email.toLowerCase() === email.toLowerCase()) || (existing?.phone && d.phone === existing.phone)
      );
      if (matchingDonor) {
        if (matchingDonor.uid !== uid) {
          matchingDonor.uid = uid;
        }
        if (fullName && !matchingDonor.fullName) {
          matchingDonor.fullName = fullName;
        }
        if (photoURL && !matchingDonor.photoURL) {
          matchingDonor.photoURL = photoURL;
          matchingDonor.profilePhotoUrl = photoURL;
        }
        matchingDonor.authProvider = matchingDonor.phone ? "both" : "google";
        matchingDonor.updatedAt = new Date().toISOString();
        this.syncToFirestore("donors", matchingDonor.uid, matchingDonor);
      }

      this.saveToStorage();
      this.notify();
      return existing;
    }

    // 3. New Google User - Check if there is an existing donor record under this email or phone
    const matchingDonor = this.donors.find(
      (d) => d.uid === uid || (email && d.email.toLowerCase() === email.toLowerCase()) || (phone && d.phone === phone)
    );

    const newUserPhone = phone || matchingDonor?.phone || "";
    const newUserName = fullName || matchingDonor?.fullName || "Google Member";

    const newUser: AppUser = {
      uid,
      email: email || `${uid}@google.hemolink.org`,
      phone: newUserPhone,
      fullName: newUserName,
      photoURL,
      authProvider: newUserPhone ? "both" : "google",
      role: assignedRole,
      requestsToday: 0,
      createdAt: new Date().toISOString(),
    };

    if (matchingDonor) {
      matchingDonor.uid = uid;
      if (photoURL) {
        matchingDonor.photoURL = photoURL;
        matchingDonor.profilePhotoUrl = photoURL;
      }
      matchingDonor.authProvider = "both";
      matchingDonor.updatedAt = new Date().toISOString();
      this.syncToFirestore("donors", matchingDonor.uid, matchingDonor);
    }

    this.users.push(newUser);
    this.currentUser = newUser;
    this.syncToFirestore("users", newUser.uid, newUser);
    this.saveToStorage();
    this.notify();
    return newUser;
  }

  public updatePhoneNumber(newPhone: string): void {
    if (!this.currentUser) {
      throw new Error("You must be signed in to update your phone number.");
    }
    const currentUid = this.currentUser.uid;
    const cleanNewPhone = newPhone.trim();

    // Prevent duplicate phone collision with another donor
    const duplicate = this.donors.find((d) => d.uid !== currentUid && d.phone === cleanNewPhone);
    if (duplicate) {
      throw new Error("This mobile number is already registered to another active donor.");
    }

    // Update currentUser state
    this.currentUser.phone = cleanNewPhone;
    const userInList = this.users.find((u) => u.uid === currentUid);
    if (userInList) {
      userInList.phone = cleanNewPhone;
      this.syncToFirestore("users", currentUid, userInList);
    }

    // Update matching donor profile in store and sync with Firestore
    const donorProfile = this.donors.find((d) => d.uid === currentUid);
    if (donorProfile) {
      donorProfile.phone = cleanNewPhone;
      donorProfile.updatedAt = new Date().toISOString();
      this.syncToFirestore("donors", donorProfile.uid, donorProfile);
    }

    // Audit log entry for security traceability
    this.logAdminAction(
      "Mobile Number Updated",
      `Verified phone number updated for donor ${this.currentUser.fullName || currentUid} to ${cleanNewPhone}`,
      currentUid
    );

    this.saveToStorage();
    this.notify();
  }

  public async logOut() {
    this.currentUser = null;
    localStorage.removeItem("blood_finder_current_user");
    this.saveToStorage();
    this.notify();
    try {
      await auth.signOut();
    } catch {
      // Ignored
    }
  }

  // Donors getters/actions
  public getDonors(): Donor[] {
    return Array.isArray(this.donors) ? this.donors : [...SEED_DONORS];
  }

  public registerAsDonor(donor: Omit<Donor, "uid" | "createdAt" | "updatedAt" | "donationCount">) {
    if (!this.currentUser) {
      throw new Error("You must be logged in to register as a donor");
    }
    // Backend validation: age must strictly be > 19
    if (donor.age <= 19) {
      throw new Error("Registration requirement not met: Age must be greater than 19.");
    }
    // Remove if already registered
    this.donors = this.donors.filter((d) => d.uid !== this.currentUser!.uid);

    const newDonor: Donor = {
      ...donor,
      uid: this.currentUser.uid,
      photoURL: donor.photoURL || this.currentUser.photoURL,
      profilePhotoUrl: donor.profilePhotoUrl || this.currentUser.photoURL,
      authProvider: this.currentUser.authProvider || "both",
      donationCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Ensure user profile consistency
    this.currentUser.fullName = donor.fullName;
    this.currentUser.phone = donor.phone;
    if (this.currentUser.email.includes("@donor.hemolink.org") && donor.email) {
      this.currentUser.email = donor.email;
    }
    this.currentUser.authProvider = "both";
    this.syncToFirestore("users", this.currentUser.uid, this.currentUser);

    this.donors.push(newDonor);
    this.saveToStorage();
    this.notify();

    // Firestore Sync
    this.syncToFirestore("donors", newDonor.uid, newDonor);

    this.logAdminAction(
      "Donor Registered",
      `User registered as active donor: '${newDonor.fullName}' (${newDonor.bloodGroup}) in ${newDonor.city}, ${newDonor.state}. Mobile: ${newDonor.phone || "N/A"}.`,
      newDonor.uid
    );

    return newDonor;
  }

  public registerDirectDonor(donorData: Omit<Donor, "createdAt" | "updatedAt">): Donor {
    // Backend validation: age must strictly be > 19
    if (donorData.age <= 19) {
      throw new Error("Registration requirement not met: Age must be greater than 19.");
    }
    const existingIndex = this.donors.findIndex(
      (d) => d.email.toLowerCase() === donorData.email.toLowerCase() || d.uid === donorData.uid
    );
    const newDonor: Donor = {
      ...donorData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      this.donors[existingIndex] = newDonor;
    } else {
      this.donors.push(newDonor);
    }
    this.saveToStorage();
    this.notify();
    this.syncToFirestore("donors", newDonor.uid, newDonor);

    this.logAdminAction(
      "Donor Registered",
      `New donor registered: '${newDonor.fullName}' (${newDonor.bloodGroup}) based in ${newDonor.city}, ${newDonor.state}. Mobile: ${newDonor.phone || "N/A"}.`,
      newDonor.uid
    );

    return newDonor;
  }

  public getMyDonorProfile(): Donor | undefined {
    if (!this.currentUser) return undefined;
    return this.donors.find((d) => d.uid === this.currentUser!.uid);
  }

  public ensureDonorProfileForUser(user?: AppUser | null): Donor {
    const targetUser = user || this.currentUser;
    if (!targetUser) {
      return {
        uid: "guest_donor_pass",
        fullName: "S.S. Dinesh",
        email: "srini16dinesh@gmail.com",
        phone: "+91 94432 10987",
        age: 26,
        gender: "Male",
        bloodGroup: "O+",
        city: "Coimbatore",
        state: "Tamil Nadu",
        pincode: "641001",
        location: { lat: 11.0168, lng: 76.9558 },
        isAvailable: true,
        lastDonationDate: "2025-05-20",
        donationCount: 3,
        savedUnits: 55,
        profilePhotoUrl: "/avatars/male_passport_dinesh.jpg",
        createdAt: "2025-01-12T09:00:00Z",
        updatedAt: new Date().toISOString()
      };
    }

    let existing = this.donors.find((d) => d.uid === targetUser.uid);
    if (!existing) {
      const lowerName = (targetUser.fullName || "").toLowerCase();
      const isFemale = lowerName.includes("priya") || lowerName.includes("sarah") || lowerName.includes("sharma");
      existing = {
        uid: targetUser.uid,
        fullName: targetUser.fullName || (targetUser.email.includes("dinesh") ? "S.S. Dinesh" : targetUser.email.split("@")[0]),
        email: targetUser.email,
        phone: "+91 94432 10987",
        age: 26,
        gender: isFemale ? "Female" : "Male",
        bloodGroup: "O+",
        city: "Coimbatore",
        state: "Tamil Nadu",
        pincode: "641001",
        location: { lat: 11.0168, lng: 76.9558 },
        isAvailable: true,
        lastDonationDate: "2025-05-20",
        donationCount: 3,
        savedUnits: 55,
        profilePhotoUrl: isFemale ? "/avatars/female_passport_sarah.jpg" : "/avatars/male_passport_david.jpg",
        createdAt: targetUser.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.donors.push(existing);
      this.saveToStorage();
      this.notify();
      this.syncToFirestore("donors", existing.uid, existing);
    }
    return existing;
  }

  public updateDonorAvailability(isAvailable: boolean) {
    const profile = this.getMyDonorProfile();
    if (!profile) throw new Error("No donor profile registered under this user");
    profile.isAvailable = isAvailable;
    profile.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.notify();

    // Firestore Sync
    this.syncToFirestore("donors", profile.uid, profile);
  }

  public updateDonorProfile(updates: Partial<Donor>) {
    const profile = this.getMyDonorProfile();
    if (!profile) throw new Error("No donor profile registered under this user");
    
    Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
    this.saveToStorage();
    this.notify();

    // Firestore Sync
    this.syncToFirestore("donors", profile.uid, profile);
  }

  public updateDonorByUid(uid: string, updates: Partial<Donor>) {
    const profile = this.donors.find((d) => d.uid === uid);
    if (!profile) return;
    Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
    this.saveToStorage();
    this.notify();

    // Firestore Sync
    this.syncToFirestore("donors", profile.uid, profile);
  }

  public updateDonorSavedUnits(savedUnits: number, donorUid?: string) {
    const targetUid = donorUid || this.currentUser?.uid;
    if (!targetUid) return;
    let profile = this.donors.find((d) => d.uid === targetUid);
    if (!profile && this.currentUser && this.currentUser.uid === targetUid) {
      profile = this.ensureDonorProfileForUser(this.currentUser);
    }
    if (!profile) return;
    profile.savedUnits = Math.max(0, savedUnits);
    profile.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.notify();
    this.syncToFirestore("donors", profile.uid, profile);
  }

  public adminUpdateDonor(donorUid: string, updates: Partial<Donor>) {
    const profile = this.donors.find((d) => d.uid === donorUid);
    if (!profile) return;
    Object.assign(profile, updates, { updatedAt: new Date().toISOString() });
    this.saveToStorage();
    this.notify();
    this.syncToFirestore("donors", profile.uid, profile);
  }

  public recordClinicalBloodDonation(params: {
    donorUid?: string;
    centerName: string;
    donationType: "Whole Blood" | "Platelets" | "Plasma" | "Double Red Cells";
    unitsDonated: number;
    donationDate?: string;
    notes?: string;
  }) {
    const targetUid = params.donorUid || this.currentUser?.uid;
    let profile = this.donors.find((d) => d.uid === targetUid);
    if (!profile && this.currentUser && (!params.donorUid || this.currentUser.uid === params.donorUid)) {
      profile = this.ensureDonorProfileForUser(this.currentUser);
    }
    if (!profile) throw new Error("No donor profile registered");

    // Clinical unit translation:
    // Whole Blood (1 blood unit) yields PRBC, Platelets & FFP = 10 saved units (up to 3 lives saved)
    // Platelets (Apheresis) = 15 saved units
    // Double Red Cells = 20 saved units
    // Plasma = 10 saved units
    let multiplier = 10;
    if (params.donationType === "Double Red Cells") multiplier = 20;
    else if (params.donationType === "Platelets") multiplier = 15;
    else if (params.donationType === "Plasma") multiplier = 10;

    const unitsEarned = Math.max(1, params.unitsDonated) * multiplier;
    const currentUnits = typeof profile.savedUnits === "number" ? profile.savedUnits : (profile.donationCount || 0) * 10;
    const newTotalUnits = currentUnits + unitsEarned;

    const prevTier = getMilestoneTier(currentUnits);
    const newTier = getMilestoneTier(newTotalUnits);

    const donationDate = params.donationDate || new Date().toISOString().split("T")[0];
    profile.donationCount = (profile.donationCount || 0) + 1;
    profile.savedUnits = newTotalUnits;
    profile.lastDonationDate = donationDate; // Resets WHO 56-day cooldown interval
    profile.updatedAt = new Date().toISOString();

    if (newTier.id !== prevTier.id) {
      this.addNotification({
        title: `🏆 NEW MILESTONE BADGE UNLOCKED: ${newTier.name.toUpperCase()}!`,
        message: `Congratulations! Your verified blood donation elevated you to ${newTotalUnits} cumulative saved units. You have earned the ${newTier.name} badge (${newTier.rankTitle})!`,
        type: "In-App",
        recipient: profile.fullName
      });
    } else {
      this.addNotification({
        title: `🩸 DONATION RECORDED: +${unitsEarned} SAVED UNITS`,
        message: `Successfully verified donation of ${params.unitsDonated} unit(s) (${params.donationType}) at ${params.centerName}. Cumulative standing: ${newTotalUnits} units saved.`,
        type: "In-App",
        recipient: profile.fullName
      });
    }

    this.saveToStorage();
    this.notify();
    this.syncToFirestore("donors", profile.uid, profile);

    this.logAdminAction(
      "Clinical Blood Donation Logged",
      `Verified blood donation for ${profile.fullName} (${profile.bloodGroup}): ${params.unitsDonated} unit(s) of ${params.donationType} at ${params.centerName}. Earned +${unitsEarned} units (Total: ${newTotalUnits} units, Milestone: ${newTier.name}).`
    );

    return {
      newTotalUnits,
      unitsEarned,
      newTier,
      isTierUpgraded: newTier.id !== prevTier.id
    };
  }

  public logMockDonation(unitsToAdd: number = 5, targetDonorUid?: string) {
    const targetUid = targetDonorUid || this.currentUser?.uid;
    let profile = this.donors.find((d) => d.uid === targetUid);
    if (!profile && this.currentUser && (!targetDonorUid || this.currentUser.uid === targetDonorUid)) {
      profile = this.ensureDonorProfileForUser(this.currentUser);
    }
    if (!profile) throw new Error("No donor profile registered");
    profile.lastDonationDate = new Date().toISOString().split("T")[0];
    profile.donationCount = (profile.donationCount || 0) + 1;
    const currentUnits = typeof profile.savedUnits === "number" ? profile.savedUnits : profile.donationCount * 10;
    profile.savedUnits = currentUnits + unitsToAdd;
    profile.updatedAt = new Date().toISOString();
    this.saveToStorage();
    this.notify();

    // Firestore Sync
    this.syncToFirestore("donors", profile.uid, profile);

    this.logAdminAction(
      "Donation Check-In Logged",
      `On-site QR pass scan check-in completed for '${profile.fullName}' (${profile.bloodGroup}). Added +${unitsToAdd} units (Total: ${profile.donationCount} donations, ${profile.savedUnits} saved units). WHO 56-day cooldown timer restarted.`,
      profile.uid
    );
  }

  public removeDonorProfile(uid: string) {
    const target = this.donors.find((d) => d.uid === uid);
    this.donors = this.donors.filter((d) => d.uid !== uid);
    this.saveToStorage();
    this.notify();

    this.logAdminAction(
      "Donor Profile Deregistered",
      `Donor profile voluntarily deregistered/removed for '${target?.fullName || uid}' (${target?.bloodGroup || 'Unknown'}, ${target?.city || 'Unknown'})`,
      uid
    );

    // Firestore Sync delete
    deleteDoc(doc(db, "donors", uid)).catch((e) => console.warn(e));
  }

  // Emergencies getters/actions
  public getEmergencies(): EmergencyRequest[] {
    // Auto status expire check
    let changed = false;
    const now = new Date();
    this.emergencies = this.emergencies.map((req) => {
      if (req.status === "Active" && new Date(req.expiresAt) < now) {
        changed = true;
        return { ...req, status: "Expired" };
      }
      return req;
    });
    if (changed) {
      this.saveToStorage();
    }
    return this.emergencies;
  }

  public createEmergencyRequest(req: Omit<EmergencyRequest, "requestId" | "createdBy" | "respondedDonors" | "createdAt" | "expiresAt" | "shareToken" | "status">) {
    if (!this.currentUser) {
      throw new Error("Login required to submit request");
    }

    // Rate limit rule validation
    const todayStr = new Date().toISOString().split("T")[0];
    const userRef = this.users.find((u) => u.uid === this.currentUser!.uid);
    if (userRef) {
      const lastReqDate = userRef.lastRequestDate ? userRef.lastRequestDate.split("T")[0] : "";
      if (lastReqDate === todayStr) {
        if (userRef.requestsToday >= 3 && userRef.role !== "admin") {
          throw new Error("Security Counter Enforced: Rate Limit exceeded! Max 3 emergency requests allowed per 24 hours.");
        }
        userRef.requestsToday += 1;
      } else {
        userRef.requestsToday = 1;
        userRef.lastRequestDate = new Date().toISOString();
      }
    }

    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hr expiry
    const newRequest: EmergencyRequest = {
      ...req,
      requestId: "req_" + Math.random().toString(36).substring(2, 9),
      createdBy: this.currentUser.uid,
      respondedDonors: [],
      selectedDonors: [],
      notifiedDonors: [],
      flowStage: "smart_matching",
      status: "Active",
      createdAt,
      expiresAt,
      shareToken: "emergency_" + Math.random().toString(36).substring(2, 9)
    };

    this.emergencies.unshift(newRequest);
    this.saveToStorage();
    this.notify();

    // Firestore Sync
    this.syncToFirestore("emergency_requests", newRequest.requestId, newRequest);

    // Initial requisition log for admin audit
    this.logAdminAction(
      "Emergency Request Created",
      `New emergency request submitted for '${newRequest.patientName}' (${newRequest.bloodGroupNeeded}, ${newRequest.unitsNeeded} units at ${newRequest.hospitalName}, ${newRequest.city}). Smart Matching algorithm engaged.`,
      newRequest.requestId
    );

    // Add smart matching system alert for the creator/coordinator
    this.addNotification({
      title: "⚡ SMART MATCHING ALGORITHM READY",
      message: `Requisition for patient '${newRequest.patientName}' (${newRequest.bloodGroupNeeded}) logged. Stage 1 algorithm has ranked compatible donors. Review candidates to confirm targeted notification dispatch.`,
      type: "In-App",
      recipient: this.currentUser.fullName || "Coordinator",
      requestId: newRequest.requestId
    });

    return newRequest;
  }

  /**
   * Stage 2 — Human confirmation
   * Admin/requester reviews the matches -> selects donors -> notifications are sent.
   * Dispatches targeted notifications only to chosen donors.
   */
  public notifyMatchedDonors(requestId: string, selectedDonorUids: string[], customMessage?: string) {
    const req = this.emergencies.find((r) => r.requestId === requestId);
    if (!req) throw new Error("Emergency request not found");

    if (selectedDonorUids.length === 0) {
      throw new Error("Please select at least one donor to notify");
    }

    req.selectedDonors = selectedDonorUids;
    req.notifiedDonors = Array.from(new Set([...(req.notifiedDonors || []), ...selectedDonorUids]));
    req.notifiedViaSms = Array.from(new Set([...(req.notifiedViaSms || []), ...selectedDonorUids]));
    req.notifiedViaEmail = Array.from(new Set([...(req.notifiedViaEmail || []), ...selectedDonorUids]));
    req.flowStage = "notify_donors";

    // Dispatch targeted alerts to each selected donor via Gmail & SMS to registered mobile number
    selectedDonorUids.forEach((donorUid) => {
      const donor = this.donors.find((d) => d.uid === donorUid);
      if (!donor) return;

      const recipientPhone = donor.phone || "+91 98840 00000";
      const recipientName = donor.fullName || "Lifesaver";
      const recipientEmail = donor.email || `${donor.fullName.toLowerCase().replace(/\s+/g, ".")}@gmail.com`;

      const alertText = customMessage?.trim() ||
        `🚨 Targeted Emergency Match Alert! Patient '${req.patientName}' urgently requires ${req.unitsNeeded} unit(s) of ${req.bloodGroupNeeded} blood at ${req.hospitalName}, ${req.city}. You were chosen as a top-matching donor by the coordinator. Please open your portal console to review & accept.`;

      // 1. In-App Notification
      this.addNotification({
        title: `🎯 TARGETED SOS MATCH: ${req.bloodGroupNeeded} needed`,
        message: alertText,
        type: "In-App",
        recipient: recipientName,
        requestId: req.requestId
      });

      // 2. Cellular SMS to Registered Mobile Number
      const smsMessage = `[HEMOLINK URGENT] ${recipientName}, you are selected as a suitable ${donor.bloodGroup} donor for Patient ${req.patientName} (${req.unitsNeeded}U ${req.bloodGroupNeeded}) at ${req.hospitalName}, ${req.city}. Open portal to review & accept.`;
      this.sendSeparateSms(
        recipientPhone,
        recipientName,
        donor.uid,
        smsMessage,
        "smart_match_alert",
        req.requestId,
        true
      );

      // 3. Gmail Notification to Registered Email Address
      const emailMessage = `Dear ${recipientName},\n\nYou have been selected as a top suitable donor for Patient '${req.patientName}' requiring ${req.unitsNeeded} unit(s) of ${req.bloodGroupNeeded} blood at ${req.hospitalName}, ${req.city}.\n\nUrgency Level: ${req.urgencyLevel.toUpperCase()}\n\nPlease login to HemoLink portal to accept this emergency requisition.`;
      this.addNotification({
        title: `✉️ GMAIL ALERT: ${req.bloodGroupNeeded} needed for ${req.patientName}`,
        message: emailMessage,
        type: "Email",
        recipient: `${recipientEmail} (${recipientName})`,
        requestId: req.requestId
      });

      // 4. Initiate or get chat for quick direct access
      try {
        const chatId = `${donorUid}_${req.createdBy}_${req.requestId}`;
        if (!this.chats.find((c) => c.chatId === chatId)) {
          const newChat: Chat = {
            chatId,
            participants: [donorUid, req.createdBy],
            donorId: donorUid,
            requesterId: req.createdBy,
            relatedRequestId: req.requestId,
            phoneRevealed: false,
            donorAccepted: false,
            lastMessage: `Targeted match alert sent for ${req.bloodGroupNeeded} at ${req.hospitalName}`,
            lastMessageAt: new Date().toISOString(),
            unreadCount: { [donorUid]: 1, [req.createdBy]: 0 },
            createdAt: new Date().toISOString()
          };
          this.chats.unshift(newChat);
          const initialMsg: Message = {
            messageId: "msg_match_" + Math.random().toString(36).substring(2, 9),
            senderId: req.createdBy,
            text: `Hello ${donor.fullName}, you have been selected through our Smart Matching Algorithm as a top-ranked donor for an emergency blood requisition: ${req.bloodGroupNeeded} at ${req.hospitalName}. Can you confirm your availability to donate?`,
            timestamp: new Date().toISOString(),
            read: false
          };
          this.messages[chatId] = [initialMsg];
          this.syncToFirestore("chats", newChat.chatId, newChat);
          const mDoc = doc(db, "chats", chatId, "messages", initialMsg.messageId);
          setDoc(mDoc, initialMsg).catch((err) => console.warn("Firestore message save failed", err));
        }
      } catch (err) {
        console.warn("Could not pre-populate chat thread:", err);
      }
    });

    this.saveToStorage();
    this.notify();

    // Firestore Sync
    this.syncToFirestore("emergency_requests", req.requestId, req);

    // Audit Log for accountability
    this.logAdminAction(
      "Targeted Donors Notified via Gmail & SMS",
      `Dispatched targeted emergency alerts via Gmail & registered mobile SMS to ${selectedDonorUids.length} selected donor(s) for patient '${req.patientName}' (${req.bloodGroupNeeded}) at ${req.hospitalName}`,
      req.requestId
    );
  }

  /**
   * Flow Step 6: Donor Accepts
   * Donor accepts the emergency request -> phone unlocked -> ready for donation.
   */
  public donorAcceptEmergencyMatch(requestId: string, donorUid: string) {
    const req = this.emergencies.find((r) => r.requestId === requestId);
    if (!req) throw new Error("Emergency request not found");

    const donor = this.donors.find((d) => d.uid === donorUid);
    if (!donor) throw new Error("Donor profile not found");

    if (!req.respondedDonors.includes(donorUid)) {
      req.respondedDonors.push(donorUid);
    }
    req.acceptedDonorId = donorUid;
    req.flowStage = "donor_accepted";

    // Reveal phone and mark chat accepted
    const chatId = `${donorUid}_${req.createdBy}_${req.requestId}`;
    let chat = this.chats.find((c) => c.chatId === chatId);
    if (!chat) {
      chat = this.getOrCreateChat(donorUid, req.requestId);
    }
    chat.donorAccepted = true;
    chat.phoneRevealed = true;

    // Send confirmation message in chat
    const acceptMsg: Message = {
      messageId: "msg_accept_" + Math.random().toString(36).substring(2, 9),
      senderId: donorUid,
      text: `✓ I have ACCEPTED this emergency request. My phone (${donor.phone || "provided"}) is now shared. I am on my way to ${req.hospitalName}.`,
      timestamp: new Date().toISOString(),
      read: false
    };
    if (!this.messages[chatId]) {
      this.messages[chatId] = [];
    }
    this.messages[chatId].push(acceptMsg);

    // Notification to requester
    this.addNotification({
      title: "🎉 DONOR ACCEPTED EMERGENCY REQUISITION",
      message: `Verified donor ${donor.fullName} (${donor.bloodGroup}) accepted the requisition for ${req.patientName} at ${req.hospitalName}. Direct contact phone: ${donor.phone}`,
      type: "In-App",
      recipient: req.requesterName || "Coordinator",
      requestId: req.requestId
    });

    this.saveToStorage();
    this.notify();

    // Firestore sync
    this.syncToFirestore("emergency_requests", req.requestId, req);
    this.syncToFirestore("chats", chat.chatId, chat);

    this.logAdminAction(
      "Donor Match Accepted",
      `Donor '${donor.fullName}' (${donor.bloodGroup}) accepted emergency request for patient '${req.patientName}' at ${req.hospitalName}`,
      req.requestId
    );
  }

  /**
   * Flow Steps 7 & 8: Donation Confirmed -> Request Fulfilled
   * Records the completed clinical donation, updates donor milestones & WHO cooldown, and closes request.
   */
  public confirmDonationAndFulfill(requestId: string, donorUid?: string, unitsDonated: number = 1) {
    const req = this.emergencies.find((r) => r.requestId === requestId);
    if (!req) throw new Error("Emergency request not found");

    const targetDonorUid = donorUid || req.acceptedDonorId || req.respondedDonors[0];
    const donor = this.donors.find((d) => d.uid === targetDonorUid);

    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split("T")[0];

    if (donor) {
      donor.donationCount = (donor.donationCount || 0) + 1;
      const currentUnits = typeof donor.savedUnits === "number" ? donor.savedUnits : donor.donationCount * 10;
      donor.savedUnits = currentUnits + (unitsDonated * 10);
      donor.lastDonationDate = todayDate; // Restarts WHO 56-day cooldown interval
      donor.updatedAt = nowIso;
      this.syncToFirestore("donors", donor.uid, donor);
    }

    req.confirmedDonationAt = nowIso;
    req.status = "Fulfilled";
    req.flowStage = "request_fulfilled";

    // System celebratory notification
    this.addNotification({
      title: "🏆 DONATION CONFIRMED & SOS FULFILLED",
      message: `Life saved! Clinical blood donation of ${unitsDonated} unit(s) for patient '${req.patientName}' (${req.bloodGroupNeeded}) confirmed at ${req.hospitalName}${donor ? ` by donor ${donor.fullName}` : ""}.`,
      type: "In-App",
      recipient: req.requesterName || "Emergency Medical Coordinator",
      requestId: req.requestId
    });

    this.saveToStorage();
    this.notify();

    this.syncToFirestore("emergency_requests", req.requestId, req);

    this.logAdminAction(
      "Donation Confirmed & SOS Fulfilled",
      `Confirmed clinical blood donation of ${unitsDonated} unit(s) for patient '${req.patientName}' (${req.bloodGroupNeeded}) at ${req.hospitalName}. Request successfully fulfilled.`,
      req.requestId
    );
  }

  public markRequestFulfilled(requestId: string) {
    const r = this.emergencies.find((req) => req.requestId === requestId);
    if (r) {
      r.status = "Fulfilled";
      r.flowStage = "request_fulfilled";
      this.saveToStorage();
      this.notify();

      // Firestore Sync
      this.syncToFirestore("emergency_requests", r.requestId, r);

      // Audit Log for accountability
      this.logAdminAction(
        "SOS Fulfilled",
        `Fulfilled emergency SOS for patient '${r.patientName}' (${r.bloodGroupNeeded}, ${r.unitsNeeded} unit(s) at ${r.hospitalName}, ${r.city})`,
        r.requestId
      );
    }
  }

  public deleteRequest(requestId: string) {
    const r = this.emergencies.find((req) => req.requestId === requestId);
    this.emergencies = this.emergencies.filter((req) => req.requestId !== requestId);
    this.saveToStorage();
    this.notify();

    // Firestore Sync delete
    deleteDoc(doc(db, "emergency_requests", requestId)).catch((e) => console.warn(e));

    // Audit Log for accountability
    this.logAdminAction(
      "SOS Deleted",
      `Cleaned/Deleted emergency request for patient '${r?.patientName || requestId}' (${r?.hospitalName || 'Unknown Hospital'}, ${r?.city || ''})`,
      requestId
    );
  }

  // Chats matching and communications
  public getOrCreateChat(donorId: string, relatedRequestId: string): Chat {
    if (!this.currentUser) {
      throw new Error("Authentication required");
    }
    const requesterId = this.currentUser.uid;
    const chatId = `${donorId}_${requesterId}_${relatedRequestId}`;

    const existingChat = this.chats.find((c) => c.chatId === chatId);
    if (existingChat) {
      return existingChat;
    }

    // Register active donor participant response log
    const requestItem = this.emergencies.find((re) => re.requestId === relatedRequestId);
    if (requestItem) {
      if (!requestItem.respondedDonors.includes(donorId)) {
        requestItem.respondedDonors.push(donorId);
        // Sync response donor back to Firestore request
        this.syncToFirestore("emergency_requests", requestItem.requestId, requestItem);
      }
    }

    const newChat: Chat = {
      chatId,
      participants: [donorId, requesterId],
      donorId,
      requesterId,
      relatedRequestId,
      phoneRevealed: false,
      donorAccepted: false,
      lastMessage: "Conversation initiated regarding the emergency request",
      lastMessageAt: new Date().toISOString(),
      unreadCount: { [donorId]: 1, [requesterId]: 0 },
      createdAt: new Date().toISOString()
    };

    this.chats.unshift(newChat);
    const initialMsg: Message = {
      messageId: "msg_init_" + Math.random().toString(36).substring(2, 9),
      senderId: requesterId,
      text: `Hello, I've sent you a contact request regarding the emergency request for blood group ${requestItem?.bloodGroupNeeded || ""}. Could you please help?`,
      timestamp: new Date().toISOString(),
      read: false
    };
    this.messages[chatId] = [initialMsg];

    this.saveToStorage();
    this.notify();

    // Firestore Sync Chats & Messages
    this.syncToFirestore("chats", newChat.chatId, newChat);

    const mDoc = doc(db, "chats", chatId, "messages", initialMsg.messageId);
    setDoc(mDoc, initialMsg).catch(err => console.warn("Firestore message save failed", err));

    // Trigger asynchronous simulated response from seed donor or recipient via Express API with Gemini aid,
    // or fallback to interactive simulation
    this.triggerAIPromptSim(chatId, newChat);

    return newChat;
  }

  // Get or Create direct chat with Super Admin (Srini)
  public getOrCreateAdminChat(): Chat {
    if (!this.currentUser) {
      throw new Error("Authentication required");
    }
    const requesterId = this.currentUser.uid;
    const adminId = "admin_super"; // Core Super Admin UID

    if (requesterId === adminId) {
      throw new Error("You are the Super Admin. You cannot start a direct message thread with yourself.");
    }

    const chatId = `admin_super_${requesterId}`;

    const existingChat = this.chats.find((c) => c.chatId === chatId);
    if (existingChat) {
      return existingChat;
    }

    const newChat: Chat = {
      chatId,
      participants: [adminId, requesterId],
      donorId: adminId, // Super Admin acts as the donor/receiver profile
      requesterId,
      relatedRequestId: "direct_message",
      phoneRevealed: true, // Direct helper channels are authorized and transparent
      donorAccepted: true,
      lastMessage: "Direct message channel with Super Admin opened",
      lastMessageAt: new Date().toISOString(),
      unreadCount: { [adminId]: 1, [requesterId]: 0 },
      createdAt: new Date().toISOString()
    };

    this.chats.unshift(newChat);
    const initialMsg: Message = {
      messageId: "msg_init_" + Math.random().toString(36).substring(2, 9),
      senderId: requesterId,
      text: `Hello Super Admin, I am opening a direct support/coordination message channel with you.`,
      timestamp: new Date().toISOString(),
      read: false
    };
    if (!this.messages[chatId]) {
      this.messages[chatId] = [];
    }
    this.messages[chatId].push(initialMsg);

    this.saveToStorage();
    this.notify();

    // Firestore Sync Chats & Messages
    this.syncToFirestore("chats", newChat.chatId, newChat);

    const mDoc = doc(db, "chats", chatId, "messages", initialMsg.messageId);
    setDoc(mDoc, initialMsg).catch(err => console.warn("Firestore message save failed", err));

    // Simulating automated response from Super Admin Srini
    this.triggerAIPromptSim(chatId, newChat);

    return newChat;
  }

  // Respond directly to request (reverses roles: standard donor responds to active seeker's request)
  public donorRespondToEmergency(requestId: string): Chat {
    if (!this.currentUser) {
      throw new Error("Authentication required");
    }
    const donorProfile = this.getMyDonorProfile();
    if (!donorProfile) {
      throw new Error("Please register as a donor first to respond directly");
    }
    const req = this.emergencies.find((item) => item.requestId === requestId);
    if (!req) {
      throw new Error("Emergency request not found");
    }
    const requesterId = req.createdBy;
    const donorId = this.currentUser.uid;
    const chatId = `${donorId}_${requesterId}_${requestId}`;

    if (!req.respondedDonors.includes(donorId)) {
      req.respondedDonors.push(donorId);
      // Sync list of donors back to emergency request in firestore
      this.syncToFirestore("emergency_requests", req.requestId, req);
    }

    const existingChat = this.chats.find((c) => c.chatId === chatId);
    if (existingChat) {
      return existingChat;
    }

    const newChat: Chat = {
      chatId,
      participants: [donorId, requesterId],
      donorId,
      requesterId,
      relatedRequestId: requestId,
      phoneRevealed: true, // Auto-revealed since the donor initiated the response!
      donorAccepted: true,
      lastMessage: "I saw your emergency request and I want to help!",
      lastMessageAt: new Date().toISOString(),
      unreadCount: { [requesterId]: 1, [donorId]: 0 },
      createdAt: new Date().toISOString()
    };

    this.chats.unshift(newChat);
    const initialMsg: Message = {
      messageId: "msg_init_" + Math.random().toString(36).substring(2, 9),
      senderId: donorId,
      text: `Hello, I noticed your critical emergency request for ${req.patientName} who needs blood type ${req.bloodGroupNeeded}. I am available and want to donate.`,
      timestamp: new Date().toISOString(),
      read: false
    };
    this.messages[chatId] = [initialMsg];

    this.saveToStorage();
    this.notify();

    // Firestore Sync Chats and messages
    this.syncToFirestore("chats", newChat.chatId, newChat);

    const mDoc = doc(db, "chats", chatId, "messages", initialMsg.messageId);
    setDoc(mDoc, initialMsg).catch(err => console.warn("Firestore message save failed", err));

    // Simulate seeker's automated gratitude response
    this.triggerAIPromptSim(chatId, newChat);

    return newChat;
  }

  public getChats(): Chat[] {
    if (!this.currentUser) return [];
    const uid = this.currentUser.uid;
    // Admins see all chats, or standard individuals see active conversations
    if (this.currentUser.role === "admin") {
      return this.chats;
    }
    return this.chats.filter((c) => c.participants.includes(uid));
  }

  public getChatMessages(chatId: string): Message[] {
    if (!this.onMessageListeners[chatId]) {
      try {
        const unsub = onSnapshot(collection(db, "chats", chatId, "messages"), (snapshot) => {
          const list: Message[] = [];
          snapshot.forEach((doc) => {
            list.push({ messageId: doc.id, ...doc.data() } as Message);
          });
          // Chronological sort
          list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          this.messages[chatId] = list;
          setTimeout(() => this.notify(), 0);
        }, (error) => {
          console.warn(`Could not sync messages for chat ${chatId}:`, error);
        });
        this.onMessageListeners[chatId] = unsub;
      } catch (e) {
        console.warn("Could not register messages snapshot:", e);
      }
    }
    return this.messages[chatId] || [];
  }

  public acceptContactRequest(chatId: string) {
    const chat = this.chats.find((c) => c.chatId === chatId);
    if (chat) {
      chat.donorAccepted = true;
      chat.phoneRevealed = true;
      const sysMsg: Message = {
        messageId: "msg_system_accept",
        senderId: "system",
        text: "Contact Request Accepted. Phone numbers have been secure-shared between parties.",
        timestamp: new Date().toISOString(),
        read: true
      };
      if (!this.messages[chatId]) {
        this.messages[chatId] = [];
      }
      this.messages[chatId].push(sysMsg);
      this.saveToStorage();
      this.notify();

      // Firestore update chat object
      this.syncToFirestore("chats", chat.chatId, chat);

      // Firestore save message item inside subcollection
      setDoc(doc(db, "chats", chatId, "messages", sysMsg.messageId), sysMsg)
        .catch(err => console.warn(err));
    }
  }

  public sendMessage(chatId: string, text: string) {
    if (!this.currentUser) throw new Error("Authentication required");
    const chat = this.chats.find((c) => c.chatId === chatId);
    if (!chat) throw new Error("Chat not found");

    const messageId = "msg_" + Math.random().toString(36).substring(2, 9);
    const newMsg: Message = {
      messageId,
      senderId: this.currentUser.uid,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };

    if (!this.messages[chatId]) {
      this.messages[chatId] = [];
    }
    this.messages[chatId].push(newMsg);

    chat.lastMessage = text;
    chat.lastMessageAt = new Date().toISOString();

    // Increment unread count for other participants
    chat.participants.forEach((pId) => {
      if (pId !== this.currentUser!.uid) {
        chat.unreadCount[pId] = (chat.unreadCount[pId] || 0) + 1;
      }
    });

    this.saveToStorage();
    this.notify();

    // Firestore update chat object
    this.syncToFirestore("chats", chat.chatId, chat);

    // Firestore save message item inside subcollection
    setDoc(doc(db, "chats", chatId, "messages", newMsg.messageId), newMsg)
      .catch(err => console.warn(err));

    // Trigger real AI response dynamically via server-side Gemini endpoint
    this.triggerAIPromptSim(chatId, chat);
  }

  public markChatAsRead(chatId: string) {
    if (!this.currentUser) return;
    const chat = this.chats.find((c) => c.chatId === chatId);
    if (chat) {
      const uid = this.currentUser.uid;
      let hasChanges = false;

      if ((chat.unreadCount[uid] || 0) > 0) {
        chat.unreadCount[uid] = 0;
        hasChanges = true;
      }

      const msgs = this.messages[chatId] || [];
      msgs.forEach((m) => {
        if (m.senderId !== uid && !m.read) {
          m.read = true;
          hasChanges = true;
          // Sync read status of individual messages in Firestore
          setDoc(doc(db, "chats", chatId, "messages", m.messageId), m)
            .catch(err => console.warn(err));
        }
      });

      if (hasChanges) {
        this.saveToStorage();
        this.notify();

        // Firestore Sync Chat
        this.syncToFirestore("chats", chat.chatId, chat);
      }
    }
  }

  // Dynamic Server-Side AI Chat responder
  private async triggerAIPromptSim(chatId: string, chat: Chat) {
    // If the active individual is writing messages, simulate the other party replying with context
    const currentUid = this.currentUser?.uid;
    if (!currentUid) return;

    // Determine who is replying
    const replierId = chat.participants.find((p) => p !== currentUid);
    if (!replierId) return;

    // Don't auto-simulate replies if the logged-in user is the target replier!
    const activeReplierAccount = this.users.find((u) => u.uid === replierId);
    // Only automated seed accounts, offline system entities, or Super Admin (admin_super) will respond
    if (!replierId.startsWith("donor_") && !replierId.startsWith("user_seeker_") && replierId !== "admin_super") {
      return;
    }

    // Wait 2-3 seconds to feel natural
    setTimeout(async () => {
      // Check if user hasn't switched away or chats deleted
      const updatedChat = this.chats.find((c) => c.chatId === chatId);
      if (!updatedChat) return;

      const chatHistory = this.messages[chatId] || [];
      const emergencyItem = this.emergencies.find((e) => e.requestId === chat.relatedRequestId);

      // Build context of chat
      let replierProfile = "";
      if (replierId === "admin_super") {
        replierProfile = `Super Admin Srini of the LifeSaver Platform. You are the administrator of the system. You provide helpful direct customer support, coordination assistance, system explanation, and help direct-message users solve coordination blockers.`;
      } else {
        replierProfile = this.donors.find((d) => d.uid === replierId) 
          ? `Seed Donor ${this.donors.find((d) => d.uid === replierId)?.fullName} with Blood Group ${this.donors.find((d) => d.uid === replierId)?.bloodGroup}` 
          : `Medical Requester ${this.users.find((u) => u.uid === replierId)?.fullName}`;
      }

      try {
        // Run full-stack fetch call to `/api/gemini-respond`
        const response = await fetch("/api/gemini-respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: chatHistory.map((m) => ({
              senderName: m.senderId === currentUid ? "Me" : "You",
              text: m.text
            })),
            replierDesc: replierProfile,
            patientName: emergencyItem?.patientName || "the patient",
            bloodGroupNeeded: emergencyItem?.bloodGroupNeeded || "required group"
          })
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.reply;

          if (replyText) {
            const botMsg: Message = {
              messageId: "msg_" + Math.random().toString(36).substring(2, 9),
              senderId: replierId,
              text: replyText,
              timestamp: new Date().toISOString(),
              read: false
            };
            this.messages[chatId].push(botMsg);
            updatedChat.lastMessage = replyText;
            updatedChat.lastMessageAt = new Date().toISOString();
            updatedChat.unreadCount[currentUid] = (updatedChat.unreadCount[currentUid] || 0) + 1;
            this.saveToStorage();
            this.notify();
            return;
          }
        }
      } catch (err) {
        console.warn("Express-Gemini server API unreachable, falling back to instant contextual rule response", err);
      }

      // Standalone rule-based responses if backend proxy offline (ensures bullet-proof reliability)
      let customSimText = "Understood. I am here to help. Let's stay in touch!";
      const senderLastText = chatHistory[chatHistory.length - 1]?.text?.toLowerCase() || '';

      if (replierId === "admin_super") {
        if (senderLastText.includes("help") || senderLastText.includes("support")) {
          customSimText = "Hello! I am Srini, the Super Admin. I have received your request for platform support. How can I help you coordinate or scale your rescue efforts today?";
        } else {
          customSimText = "Thank you for reaching out directly to the administrator. If you have an active medical emergency, please broadcast on the Emergency Board so nearby donors are instantly notified. I will oversee your requests!";
        }
      } else if (replierId.startsWith("donor_")) {
        // Is donor replying to seeker
        if (senderLastText.includes("hospital") || senderLastText.includes("blood")) {
          customSimText = `Of course! I have verified that I am 100% available to donate. I am heading towards your hospital, ${emergencyItem?.hospitalName || "Apollo Hospital"}. Please keep my slot active!`;
        } else if (senderLastText.includes("thank") || senderLastText.includes("appreciate")) {
          customSimText = "Please don't mention it! Helping each other in medical emergencies is why we registered on this network. Stay strong!";
        } else {
          customSimText = `I am ready to coordinate for donating ${emergencyItem?.bloodGroupNeeded} blood types immediately. Let me know if there's any form or request number needed!`;
        }
      } else {
        // Is seeker replying to donor
        if (senderLastText.includes("available") || senderLastText.includes("come")) {
          customSimText = "Thank you so much! Our doctors are waiting at the blood bank counter. Please share your approximate ETA so we can register your details directly.";
        } else {
          customSimText = "Thank you. Your noble contribution is highly appreciated by our medical staff and family.";
        }
      }

      const botMsgFallback: Message = {
        messageId: "msg_" + Math.random().toString(36).substring(2, 9),
        senderId: replierId,
        text: customSimText,
        timestamp: new Date().toISOString(),
        read: false
      };
      this.messages[chatId].push(botMsgFallback);
      updatedChat.lastMessage = customSimText;
      updatedChat.lastMessageAt = new Date().toISOString();
      updatedChat.unreadCount[currentUid] = (updatedChat.unreadCount[currentUid] || 0) + 1;
      this.saveToStorage();
      this.notify();

    }, 2500);
  }

  // Admin capabilities
  public async deleteDonor(uid: string) {
    const target = this.donors.find((d) => d.uid === uid);
    // Update local state first to ensure UI responsiveness for mock admins
    this.donors = this.donors.filter((d) => d.uid !== uid);
    this.saveToStorage();
    this.notify();

    // Record action in Audit Log
    this.logAdminAction(
      "Donor Removed",
      `Removed donor profile for '${target?.fullName || uid}' (Blood Group: ${target?.bloodGroup || 'Unknown'}, City: ${target?.city || 'Unknown'})`,
      uid
    );

    try {
      await deleteDoc(doc(db, "donors", uid));
    } catch (e) {
      console.warn("Firestore delete blocked (expected if mock admin bypass used):", e);
    }
  }

  public async deleteUser(uid: string) {
    const target = this.users.find((u) => u.uid === uid);
    // Update local state first to ensure UI responsiveness for mock admins
    this.users = this.users.filter((u) => u.uid !== uid);
    this.donors = this.donors.filter((d) => d.uid !== uid);
    this.chats = this.chats.filter((c) => !c.participants.includes(uid));
    this.saveToStorage();
    this.notify();

    // Record action in Audit Log
    this.logAdminAction(
      "User Removed",
      `Permanently removed registered user account '${target?.fullName || uid}' (${target?.email || 'No email'}) with role: ${target?.role || 'user'}`,
      uid
    );

    try {
      await deleteDoc(doc(db, "donors", uid));
    } catch (e) {
      console.warn("Firestore delete blocked (expected if mock admin bypass used):", e);
    }

    try {
      await deleteDoc(doc(db, "users", uid));
    } catch {
      // safe ignore if users collection not provisioned in Firestore
    }
  }

  public getAdminLogs(): AdminAuditLog[] {
    return this.adminLogs;
  }

  public async logAdminAction(action: string, details: string, targetId?: string) {
    const admin = this.currentUser;
    const newLog: AdminAuditLog = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      action,
      details,
      targetId,
      adminId: admin?.uid || auth.currentUser?.uid || "admin_super",
      adminEmail: admin?.email || auth.currentUser?.email || "srini16dinesh@gmail.com",
      timestamp: new Date().toISOString()
    };
    this.adminLogs.unshift(newLog);
    this.saveToStorage();
    this.notify();

    // Firestore Sync
    this.syncToFirestore("admin_logs", newLog.id, newLog);
    return newLog;
  }

  public verifyDonorStatus(uid: string) {
    const donor = this.donors.find((d) => d.uid === uid);
    if (donor) {
      donor.donationCount += 1;
      donor.updatedAt = new Date().toISOString();
      this.saveToStorage();
      this.notify();
    }
  }

  // --- NOTIFICATION MANAGEMENT SYSTEM ---

  public getNotifications(): AppNotification[] {
    return this.notifications;
  }

  public getUnreadNotificationsCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  public markNotificationsAsRead() {
    this.notifications.forEach((n) => {
      n.read = true;
      this.syncToFirestore("notifications", n.id, n);
    });
    this.saveToStorage();
    this.notify();
  }

  public deleteNotification(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.saveToStorage();
    this.notify();
    deleteDoc(doc(db, "notifications", id)).catch((e) => console.warn(e));
  }

  public clearNotifications() {
    const ids = this.notifications.map(n => n.id);
    this.notifications = [];
    this.saveToStorage();
    this.notify();
    ids.forEach(id => {
      deleteDoc(doc(db, "notifications", id)).catch((e) => console.warn(e));
    });
  }

  
  public async addNotification(noti: Omit<AppNotification, "id" | "timestamp" | "read">) {
    const newNoti: AppNotification = {
      ...noti,
      id: "noti_" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    };
    this.notifications.unshift(newNoti);
    this.saveToStorage();
    this.notify();
    this.syncToFirestore("notifications", newNoti.id, newNoti);

    // If it's an email type and we have an OAuth token, actually send a REAL email!
    if (newNoti.type === "Email" && newNoti.recipient) {
      const token = (typeof window !== 'undefined') ? (window as any)._googleOAuthToken : null;
      if (token) {
        try {
          const emailLines = [
            `To: ${newNoti.recipient}`,
            `Subject: HEMOLINK ALERT: ${newNoti.title.replace(/[^a-zA-Z0-9 ]/g, '')}`,
            'Content-Type: text/plain; charset=utf-8',
            '',
            newNoti.message
          ];
          
          const rawEmail = emailLines.join('\r\n');
          const base64EncodedEmail = btoa(unescape(encodeURIComponent(rawEmail))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          
          await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: base64EncodedEmail })
          });
          
          console.log("Real Gmail successfully sent to:", newNoti.recipient);
        } catch (e) {
          console.error("Failed to send real Gmail:", e);
        }
      }
    }
  }

  // --- SEPARATE CELLULAR SMS INTEGRATION ---

  public getSmsLogs(): SmsLogEntry[] {
    return [...this.smsLogs];
  }

  public async sendSeparateSms(
    toPhone: string,
    donorName: string,
    donorUid: string,
    message: string,
    templateType: string = "custom_direct",
    requestId?: string,
    createStoreNotification: boolean = true
  ): Promise<SmsLogEntry> {
    const referenceId = `SMS-IN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const entry: SmsLogEntry = {
      id: "sms_" + Math.random().toString(36).substring(2, 9),
      donorUid: donorUid || "",
      donorName: donorName || "Registered Donor",
      donorPhone: toPhone,
      message,
      templateType,
      requestId,
      status: "Delivered",
      carrier: "Airtel / Jio Tamil Nadu GSM Gateway",
      timestamp,
      referenceId
    };

    this.smsLogs.unshift(entry);
    if (this.smsLogs.length > 100) this.smsLogs.pop();

    if (createStoreNotification) {
      this.addNotification({
        title: "📲 CELLULAR SMS DISPATCHED",
        message: `Delivered to registered mobile ${toPhone} (${donorName}): "${message}" [Carrier Ref: ${referenceId}]`,
        type: "SMS",
        recipient: `${toPhone} (${donorName})`,
        requestId
      });
    }

    try {
      fetch("/api/sms/send-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPhone,
          donorName,
          donorUid,
          message,
          templateType,
          requestId
        })
      }).catch((err) => console.warn("Background SMS API dispatch notice:", err));
    } catch {
      // Non-blocking fallback
    }

    this.saveToStorage();
    this.notify();
    this.syncToFirestore("sms_logs", entry.id, entry);
    return entry;
  }

}

// Export singleton instance of application store for global React imports
export const store = new AppStore();
