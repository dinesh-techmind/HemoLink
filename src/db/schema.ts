import { pgTable, serial, text, integer, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table matching Firebase Auth UIDs
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name'),
  role: text('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Donors table
export const donors = pgTable('donors', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  age: integer('age').notNull(),
  gender: text('gender').notNull(),
  bloodGroup: text('blood_group').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  profilePhotoUrl: text('profile_photo_url'),
  isAvailable: boolean('is_available').default(true).notNull(),
  donationCount: integer('donation_count').default(0).notNull(),
  lastDonationDate: text('last_donation_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Emergency requests table
export const emergencyRequests = pgTable('emergency_requests', {
  id: serial('id').primaryKey(),
  requestId: text('request_id').notNull().unique(),
  createdBy: text('created_by').notNull(),
  requesterName: text('requester_name').notNull(),
  requesterPhone: text('requester_phone').notNull(),
  patientName: text('patient_name').notNull(),
  bloodGroupNeeded: text('blood_group_needed').notNull(),
  unitsNeeded: integer('units_needed').notNull(),
  hospitalName: text('hospital_name').notNull(),
  hospitalAddress: text('hospital_address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  urgencyLevel: text('urgency_level').notNull(),
  additionalNotes: text('additional_notes'),
  status: text('status').default('Active').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Admin Audit Logs table for accountability
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  targetId: text('target_id').notNull(),
  targetType: text('target_type').notNull(),
  performedBy: text('performed_by').notNull(),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  donors: many(donors),
  requests: many(emergencyRequests),
}));
