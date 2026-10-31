/**
 * Unified database schemas for Galgotias College Healthcare & Hostel Management.
 *
 * Designed as MongoDB collections (document model) that can be mapped 1:1
 * to PostgreSQL tables. The mobile app persists the same shapes locally.
 *
 * Collections:
 *  - users            Unified authentication + role metadata
 *  - mess_logs        Meal attendance
 *  - curfew_logs      Hostel entry / return
 *  - health_metrics   Daily physical + mental scores
 *  - chat_messages    AI wellness conversations
 *  - appointments     Counselor bookings (manual + auto-triggered)
 *  - notifications    Email/system alerts
 */

export const USER_SCHEMA = {
  collection: 'users',
  indexes: [
    { keys: { email: 1 }, unique: true },
    { keys: { 'metadata.enrollmentId': 1 }, unique: true, sparse: true },
    { keys: { 'metadata.staffId': 1 }, unique: true, sparse: true },
    { keys: { role: 1 } },
  ],
  fields: {
    _id: 'ObjectId',
    name: 'string',
    email: 'string',
    passwordHash: 'string',
    role: "enum('student','warden','council')",
    dateOfBirth: 'string (ISO date)',
    createdAt: 'ISODate',
    metadata: {
      enrollmentId: 'string?  // students',
      course: 'string?        // students',
      hostelBlock: 'string?   // students',
      roomNumber: 'string?    // students',
      mentorEmail: 'string?   // students assigned counselor',
      staffId: 'string?       // wardens',
      pgName: 'string?        // wardens assigned hostel/PG',
      councilRole: 'string?   // council team',
    },
  },
};

export const MESS_LOG_SCHEMA = {
  collection: 'mess_logs',
  indexes: [{ keys: { studentId: 1, date: 1, meal: 1 }, unique: true }],
  fields: {
    _id: 'ObjectId',
    studentId: 'ObjectId -> users',
    date: 'YYYY-MM-DD',
    meal: "enum('breakfast','lunch','dinner')",
    present: 'boolean',
    recordedBy: 'ObjectId -> users (warden)',
    timestamp: 'ISODate',
  },
};

export const CURFEW_LOG_SCHEMA = {
  collection: 'curfew_logs',
  indexes: [{ keys: { studentId: 1, date: 1 }, unique: true }],
  fields: {
    _id: 'ObjectId',
    studentId: 'ObjectId -> users',
    date: 'YYYY-MM-DD',
    entryTime: 'HH:mm',
    expectedTime: 'HH:mm (default 22:00)',
    isLate: 'boolean',
    recordedBy: 'ObjectId -> users',
    notes: 'string',
  },
};

export const HEALTH_METRICS_SCHEMA = {
  collection: 'health_metrics',
  indexes: [{ keys: { studentId: 1, date: 1 }, unique: true }],
  fields: {
    _id: 'ObjectId',
    studentId: 'ObjectId -> users',
    date: 'YYYY-MM-DD',
    steps: 'number',
    distanceKm: 'number',
    calories: 'number',
    mentalScore: 'number 0-100',
    physicalScore: 'number 0-100',
    weeklyScore: 'number 0-100',
    mood: 'string',
    lastChatSummary: 'string?',
  },
};

export const APPOINTMENT_SCHEMA = {
  collection: 'appointments',
  indexes: [{ keys: { studentId: 1, createdAt: -1 } }, { keys: { status: 1 } }],
  fields: {
    _id: 'ObjectId',
    studentId: 'ObjectId -> users',
    counselorEmail: 'string',
    counselorName: 'string',
    reason: 'string',
    status: "enum('pending','scheduled','completed','cancelled')",
    source: "enum('auto','manual')",
    healthScore: 'number',
    createdAt: 'ISODate',
    scheduledFor: 'ISODate?',
  },
};

export const COLLECTIONS = [
  USER_SCHEMA,
  MESS_LOG_SCHEMA,
  CURFEW_LOG_SCHEMA,
  HEALTH_METRICS_SCHEMA,
  APPOINTMENT_SCHEMA,
];
