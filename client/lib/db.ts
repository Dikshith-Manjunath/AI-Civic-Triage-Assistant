import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'users.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ── Users ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    department  TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'officer',
    full_name   TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login  TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
`);

// ── Tickets ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no   TEXT    NOT NULL UNIQUE,
    department  TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    title       TEXT    NOT NULL,
    description TEXT,
    location    TEXT,
    ward        TEXT,
    urgency     TEXT    NOT NULL DEFAULT 'medium',
    status      TEXT    NOT NULL DEFAULT 'open',
    assignee    TEXT,
    created_by  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_dept   ON tickets(department);
  CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
`);

// ── Ticket Events (audit trail) ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS ticket_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    action     TEXT    NOT NULL,
    actor      TEXT    NOT NULL,
    note       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id);
`);

// ── Seed tickets if empty ──────────────────────────────────────────────────
const ticketCount = (db.prepare('SELECT COUNT(*) as n FROM tickets').get() as any).n;
if (ticketCount === 0) {
  const insert = db.prepare(`
    INSERT INTO tickets (ticket_no, department, category, title, description, location, ward, urgency, status, assignee, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertEvent = db.prepare(`
    INSERT INTO ticket_events (ticket_id, action, actor, note)
    VALUES (?, ?, ?, ?)
  `);

  const seeds: [string, string, string, string, string | null, string | null, string | null, string, string, string | null, string][] = [
    // BBMP
    ['BB-2849', 'bbmp', 'Pipe Leakage', 'Water pipe burst on 12th Main', 'Main water supply line burst near the junction. Flooding the street.', '12th Main, 4th Block, Jayanagar', 'Ward 153 - Jayanagar South', 'critical', 'in_progress', 'R. Kumar', 'Citizen Portal'],
    ['BB-2901', 'bbmp', 'Waste Management', 'Garbage pile-up near Koramangala', 'Large garbage dump blocking pedestrian footpath for 3 days.', 'Koramangala 3rd Block', 'Ward 68 - Koramangala', 'high', 'open', 'S. Gupta', 'Citizen Portal'],
    ['BB-2915', 'bbmp', 'Public Lighting', 'Streetlight out on MG Road stretch', 'Multiple street lights not functioning causing safety concerns at night.', '15th Cross MG Road', 'Ward 84 - MG Road', 'medium', 'resolved', 'P. Verma', 'Patrol Report'],
    ['BB-3002', 'bbmp', 'Road Maintenance', 'Pothole on Outer Ring Road', 'Large pothole near the Marathahalli junction. Vehicle damage reported.', 'ORR Marathahalli Junction', 'Ward 150 - Marathahalli', 'high', 'in_progress', 'A. Reddy', 'Citizen Portal'],
    ['BB-3010', 'bbmp', 'Road Maintenance', 'Broken road divider near Silk Board', 'Concrete divider collapsed. Traffic hazard and causing major disruptions.', 'Silk Board Junction', 'Ward 174 - BTM Layout', 'critical', 'open', null, 'Traffic Police'],
    ['BB-3018', 'bbmp', 'Waste Management', 'Open drain overflow in Indiranagar', 'Blocked drain overflowing onto road. Foul smell affecting residents.', '100ft Road, Indiranagar', 'Ward 75 - Indiranagar', 'medium', 'open', null, 'Citizen Portal'],
    // BWSSB
    ['BW-9201', 'bwssb', 'Main Pipe Burst', 'Water main burst in Whitefield', 'Critical water main burst on the Outer Ring Road. Affecting 12 residential blocks.', 'Whitefield Outer Ring', 'Zone 6 - Whitefield', 'critical', 'resolved', 'Team Alpha', 'Sensor Alert'],
    ['BW-9208', 'bwssb', 'Meter Malfunction', 'Faulty meter in JP Nagar Ph 2', 'Water meter showing incorrect readings causing billing disputes.', 'JP Nagar Phase 2', 'Zone 4 - JP Nagar', 'medium', 'resolved', 'B. Rao', 'Public Complaint'],
    ['BW-9214', 'bwssb', 'New Connection', 'New connection request Koramangala', 'Residential complex requesting new BWSSB water connection for 48 units.', 'Koramangala 3rd Block', 'Zone 2 - East Bangalore', 'low', 'open', null, 'Online Portal'],
    ['BW-9215', 'bwssb', 'Sewage Overflow', 'Sewage overflow in HSR Layout', 'Sewage manhole overflowing onto road causing health hazard. Immediate attention.', 'HSR Layout Sector 4', 'Zone 3 - HSR Layout', 'high', 'dispatched', 'Team Bravo', 'Public Complaint'],
    ['BW-9218', 'bwssb', 'Main Pipe Burst', 'Emergency pipe burst Indiranagar', 'Large water pipe burst flooding the 100ft road. Traffic blocked.', 'Indiranagar 100ft Rd', 'Zone 1 - Indiranagar', 'critical', 'in_progress', 'Team Alpha', 'Sensor Alert'],
    ['BW-9225', 'bwssb', 'Low Water Pressure', 'Low pressure complaints Banashankari', 'Multiple residents reporting very low water pressure throughout the day.', 'Banashankari 3rd Stage', 'Zone 5 - Banashankari', 'medium', 'open', null, 'Citizen Portal'],
    // BESCOM
    ['BE-4401', 'bescom', 'Power Outage', 'Transformer failure Jayanagar', 'Feeder 2 transformer failed. 300 households without power since 6AM.', 'Jayanagar 4th Block junction', 'Feeder 2 - South', 'critical', 'in_progress', 'S. Patil', 'Automatic Alert'],
    ['BE-4408', 'bescom', 'Street Light Outage', 'Street lights off entire BTM Layout', '15 consecutive street lights not functioning. Reported twice this week.', 'BTM Layout 2nd Stage', 'Distribution Zone B', 'high', 'open', null, 'Citizen Portal'],
    ['BE-4415', 'bescom', 'Meter Tampering', 'Suspected meter tampering Hebbal', 'Unusually low electricity readings suspected meter bypass. Audit required.', 'Hebbal Kempapura', 'Zone North-2', 'medium', 'approved', 'V. Nair', 'Field Inspection'],
    ['BE-4422', 'bescom', 'Power Outage', 'Scheduled maintenance Electronic City', 'Planned shutdown between 10AM–2PM for cable replacement on Feeder 7.', 'Electronic City Phase 1', 'Industrial Zone E-City', 'low', 'resolved', 'Crew-7', 'Maintenance Plan'],
    ['BE-4430', 'bescom', 'Voltage Fluctuation', 'Frequent fluctuation Whitefield IT Park', 'Voltage fluctuations damaging industrial equipment. 6 complaints this week.', 'Whitefield EPIP Zone', 'Zone East-IT', 'high', 'open', null, 'Industry Portal'],
    ['BE-4438', 'bescom', 'Billing Dispute', 'Wrong billing residential Rajajinagar', 'Customer billed 4x normal amount. Meter not reset after previous fault.', 'Rajajinagar 2nd Block', 'Zone West-3', 'low', 'open', null, 'Online Portal'],
    // BMTC
    ['BM-7701', 'bmtc', 'Route Disruption', 'Bus route 500C diverted Silk Board', 'Route 500C diverted due to flyover construction. No alternate info provided.', 'Silk Board Flyover', 'South Corridor', 'high', 'open', null, 'Citizen Portal'],
    ['BM-7708', 'bmtc', 'Bus Breakdown', 'Bus KA-57-F-5501 stranded Majestic', 'Air-conditioned Volvo stranded on route 9. Passengers stranded for 90 mins.', 'Majestic Bus Stand', 'Central Hub', 'critical', 'resolved', 'Depot-1', 'Driver Report'],
    ['BM-7714', 'bmtc', 'Overcrowding', 'Severe overcrowding Route 401', 'Route 401 (Banashankari–MG Road) severely overcrowded during peak hours.', 'Banashankari Bus Stop', 'Bus Stop SB-401', 'medium', 'open', null, 'Public Complaint'],
    ['BM-7720', 'bmtc', 'Non-Operational Stop', 'Bus shelter damaged Koramangala', 'Bus shelter roof collapsed due to last night storm. Safety hazard.', 'Koramangala 5th Block', 'Bus Stop KRM-5', 'high', 'in_progress', 'T. Rao', 'Field Report'],
    ['BM-7726', 'bmtc', 'Route Disruption', 'New road block near Domlur flyover', 'Road dig-up by BBMP blocking bus lanes. BMTC coordination needed.', 'Domlur Flyover', 'East Corridor', 'high', 'open', null, 'Driver Report'],
    ['BM-7733', 'bmtc', 'Bus Breakdown', 'Engine failure bus KA-57-2291', 'Bus stranded near Ejipura. Fuel contamination suspected.', 'Ejipura Junction', 'SE Corridor', 'medium', 'resolved', 'Depot-4', 'Driver Report'],
    // BDA
    ['BD-3301', 'bda', 'Illegal Construction', 'Unauthorized building Sarjapur Road', 'Four-storey building under construction without BDA approval. Active site.', 'Sarjapur Road Junction', 'Layout Zone SR-12', 'critical', 'open', null, 'Public Complaint'],
    ['BD-3308', 'bda', 'Encroachment', 'Park encroachment Vidyaranyapura', 'BDA park land encroached by adjacent private plot. 30sqm lost.', 'Vidyaranyapura', 'Layout Zone VP-4', 'high', 'in_progress', 'Field Team', 'Inspection Report'],
    ['BD-3315', 'bda', 'OC Request', 'Occupancy certificate request Hebbal', 'Builder requesting Occupancy Certificate for 200-unit apartment complex.', 'Hebbal Lake Road', 'Planning Zone HB-2', 'medium', 'approved', 'J. Reddy', 'Online Portal'],
    ['BD-3321', 'bda', 'Layout Violation', 'Road setback violation in Yelahanka', 'Builder has reduced mandatory road setback from 9m to 5m in new layout.', 'Yelahanka New Town', 'Zone YNT-6', 'high', 'open', null, 'Filed Complaint'],
    // GBA
    ['GB-1101', 'gba', 'Policy Query', 'Inter-dept coordination BBMP-BWSSB', 'Road digging permissions conflict between BBMP and BWSSB. Escalated for resolution.', 'City Zone Central', 'Metropolitan Authority', 'high', 'in_progress', 'G. Sharma', 'Escalation'],
    ['GB-1108', 'gba', 'Audit Finding', 'SLA breach audit Q3 — BWSSB', 'BWSSB exceeded average resolution SLA by 2.2 days for critical tickets in Q3.', 'GBA Headquarters', 'Audit Division', 'medium', 'open', null, 'Quarterly Audit'],
    ['GB-1115', 'gba', 'Emergency Directive', 'Monsoon preparedness circular 2025', 'Issue department-wide directive for pre-monsoon drain and road clearing drives.', 'All Metropolitan Zones', 'Central Governance', 'high', 'resolved', 'Admin', 'Gov Directive'],
  ];

  for (const seed of seeds) {
    const res = insert.run(...seed);
    const ticketId = res.lastInsertRowid as number;
    // Add a created event
    insertEvent.run(ticketId, 'created', seed[10] ?? 'System', 'Ticket created');
    // If not open/in_progress, add a status event
    const status = seed[8];
    if (status === 'resolved') {
      insertEvent.run(ticketId, 'resolved', seed[9] ?? 'System', 'Issue resolved and closed.');
    } else if (status === 'approved') {
      insertEvent.run(ticketId, 'approved', seed[9] ?? 'System', 'Approved for permit / action.');
    } else if (status === 'in_progress') {
      insertEvent.run(ticketId, 'assigned', seed[9] ?? 'System', 'Assigned and work in progress.');
    } else if (status === 'dispatched') {
      insertEvent.run(ticketId, 'dispatched', seed[9] ?? 'System', 'Team dispatched to site.');
    }
  }
}

export default db;
