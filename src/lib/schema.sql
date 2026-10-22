-- Material Codification Platform — schema
-- SQLite. This mirrors, at prototype scale, the split SAP itself uses:
-- material master (core fields) + classification (class/characteristics).

CREATE TABLE IF NOT EXISTS taxonomy_nodes (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES taxonomy_nodes(id),
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  class_code TEXT,              -- set only on leaf nodes that have a classification class
  material_group TEXT,          -- SAP material group this maps to
  description TEXT
);

CREATE TABLE IF NOT EXISTS classes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  naming_template TEXT NOT NULL,     -- e.g. "{noun} {modifier} {series} {seal} {make}"
  noun TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS characteristics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_code TEXT NOT NULL REFERENCES classes(code),
  name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  data_type TEXT NOT NULL,      -- text, number, enum
  unit TEXT,
  mandatory INTEGER NOT NULL DEFAULT 0,
  enum_values TEXT,             -- comma separated if data_type = enum
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Existing SAP material master extract (the "already codified" universe we check against)
CREATE TABLE IF NOT EXISTS materials (
  material_number TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  taxonomy_id TEXT REFERENCES taxonomy_nodes(id),
  class_code TEXT REFERENCES classes(code),
  material_type TEXT NOT NULL,
  material_group TEXT NOT NULL,
  base_uom TEXT NOT NULL,
  manufacturer TEXT,
  mfr_part_no TEXT,
  plant TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',   -- Active, Blocked, Marked for Deletion
  characteristics_json TEXT NOT NULL DEFAULT '{}',
  created_on TEXT NOT NULL,
  last_movement TEXT,
  annual_spend REAL DEFAULT 0,
  dq_score INTEGER DEFAULT 100            -- data quality completeness score 0-100
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,          -- Requester, Steward, CategoryOwner, Admin
  email TEXT,
  plant TEXT
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  free_text TEXT NOT NULL,
  requester_id TEXT REFERENCES users(id),
  taxonomy_id TEXT REFERENCES taxonomy_nodes(id),
  class_code TEXT REFERENCES classes(code),
  characteristics_json TEXT NOT NULL DEFAULT '{}',
  manufacturer TEXT,
  mfr_part_no TEXT,
  generated_description TEXT,
  status TEXT NOT NULL DEFAULT 'Draft',
  -- Draft, Duplicate Review, Pending Approval, Returned, Approved, Rejected, Created in SAP
  duplicate_decision TEXT,     -- Reuse, ConfirmedNew, null
  reused_material_number TEXT,
  ai_confidence INTEGER,       -- confidence of AI auto-extraction/classification 0-100
  sap_material_number TEXT,
  priority TEXT DEFAULT 'Normal',
  plant TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sla_due_at TEXT
);

CREATE TABLE IF NOT EXISTS request_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL REFERENCES requests(id),
  material_number TEXT NOT NULL REFERENCES materials(material_number),
  similarity_score REAL NOT NULL,
  match_reason TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT REFERENCES requests(id),
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,          -- user, assistant
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
