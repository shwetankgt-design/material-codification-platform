import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { taxonomyTree, classes } from "./taxonomy-data";
import { generateMaterials } from "./seed-data";
import { SCHEMA_SQL } from "./schema";

// Vercel's serverless functions have a read-only filesystem except /tmp, and /tmp itself
// is wiped between cold starts (no persistent disk across invocations/deployments). This
// is a demo-scale tradeoff, not a hidden bug: on Vercel the DB reseeds on every cold start,
// which for a seeded/deterministic dataset means the app always boots into a consistent
// state — real persistence needs a hosted DB (Postgres/Turso/etc), a drop-in swap behind
// the same getDb() interface when this moves past prototype.
const DB_PATH = process.env.VERCEL
  ? path.join("/tmp", "app.db")
  : path.join(process.cwd(), "data", "app.db");

declare global {
  // eslint-disable-next-line no-var
  var __mcpDb: Database.Database | undefined;
}

function init(db: Database.Database) {
  db.exec(SCHEMA_SQL);

  const row = db.prepare("SELECT COUNT(*) as c FROM materials").get() as { c: number };
  if (row.c > 0) return; // already seeded

  const insertNode = db.prepare(
    `INSERT OR IGNORE INTO taxonomy_nodes (id, parent_id, name, level, class_code, material_group) VALUES (?,?,?,?,?,?)`
  );
  const tx1 = db.transaction(() => {
    for (const n of taxonomyTree) {
      insertNode.run(n.id, n.parentId, n.name, n.level, n.classCode ?? null, n.materialGroup ?? null);
    }
  });
  tx1();

  const insertClass = db.prepare(`INSERT OR IGNORE INTO classes (code, name, naming_template, noun) VALUES (?,?,?,?)`);
  const insertChar = db.prepare(
    `INSERT INTO characteristics (class_code, name, field_key, data_type, unit, mandatory, enum_values, sort_order) VALUES (?,?,?,?,?,?,?,?)`
  );
  const tx2 = db.transaction(() => {
    for (const c of classes) {
      insertClass.run(c.code, c.name, c.namingTemplate, c.noun);
      c.characteristics.forEach((ch, idx) => {
        insertChar.run(c.code, ch.name, ch.fieldKey, ch.dataType, ch.unit ?? null, ch.mandatory ? 1 : 0, ch.enumValues?.join(",") ?? null, idx);
      });
    }
  });
  tx2();

  const insertMaterial = db.prepare(`
    INSERT INTO materials
      (material_number, description, taxonomy_id, class_code, material_type, material_group, base_uom,
       manufacturer, mfr_part_no, plant, status, characteristics_json, created_on, last_movement, annual_spend, dq_score)
    VALUES (@materialNumber,@description,@taxonomyId,@classCode,@materialType,@materialGroup,@baseUom,
            @manufacturer,@mfrPartNo,@plant,@status,@characteristicsJson,@createdOn,@lastMovement,@annualSpend,@dqScore)
  `);
  const materials = generateMaterials();
  const tx3 = db.transaction(() => {
    for (const m of materials) {
      insertMaterial.run({
        materialNumber: m.materialNumber,
        description: m.description,
        taxonomyId: m.taxonomyId,
        classCode: m.classCode,
        materialType: m.materialType,
        materialGroup: m.materialGroup,
        baseUom: m.baseUom,
        manufacturer: m.manufacturer,
        mfrPartNo: m.mfrPartNo,
        plant: m.plant,
        status: m.status,
        characteristicsJson: JSON.stringify(m.characteristics),
        createdOn: m.createdOn,
        lastMovement: m.lastMovement,
        annualSpend: m.annualSpend,
        dqScore: m.dqScore,
      });
    }
  });
  tx3();

  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, name, role, email, password, plant) VALUES (?,?,?,?,?,?)`
  );
  const tx4 = db.transaction(() => {
    insertUser.run("u-req-1", "Rahul Mehta", "Requester", "rahul.mehta@greenlam.com", "demo123", "1000 - Mundra");
    insertUser.run("u-req-2", "Priya Nair", "Requester", "priya.nair@greenlam.com", "demo123", "2000 - Behror");
    insertUser.run("u-stw-1", "Anita Deshmukh", "Steward", "anita.deshmukh@greenlam.com", "demo123", null);
    insertUser.run("u-stw-2", "Vikram Shah", "Steward", "vikram.shah@greenlam.com", "demo123", null);
    insertUser.run("u-own-1", "Suresh Iyer", "CategoryOwner", "suresh.iyer@greenlam.com", "demo123", null);
    insertUser.run("u-adm-1", "System Admin", "Admin", "admin@greenlam.com", "demo123", null);
  });
  tx4();
}

export function getDb(): Database.Database {
  if (!global.__mcpDb) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    init(db);
    global.__mcpDb = db;
  }
  return global.__mcpDb;
}

export function resetDb() {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  global.__mcpDb = undefined;
  return getDb();
}
