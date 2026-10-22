// "Smart Intake Copilot" — local NLP engine.
//
// Honest framing (see README): this is rule/pattern-based extraction, not a hosted LLM call —
// chosen deliberately so the demo has zero external API dependency and 100% reproducible output.
// The extraction, classification and generation functions below are written so that swapping in
// a real LLM call (e.g. Claude) later means replacing the body of `extractAttributes` /
// `classifyFreeText` with an API call — the calling code and UI do not change.

import { classes, taxonomyTree, getClass, renderDescription, type ClassDef } from "./taxonomy-data";

export type ExtractionResult = {
  classCode: string | null;
  taxonomyId: string | null;
  confidence: number; // 0-100
  values: Record<string, string>;
  missingMandatory: string[];
  notes: string[];
};

const classKeywords: Record<string, string[]> = {
  BALL_BEARING: ["bearing", "brg", "ball bearing", "skf", "fag", "nsk", "ntn", "6205", "6204", "6206"],
  HEX_BOLT: ["bolt", "hex bolt", "fastener", "screw", "nut", "stud"],
  VBELT: ["belt", "v-belt", "vbelt", "fan belt"],
  AC_MOTOR: ["motor", "ac motor", "induction motor", "kw", "hp"],
  HYD_CYLINDER: ["cylinder", "hydraulic cylinder", "ram"],
  PNEUM_VALVE: ["valve", "solenoid", "pneumatic valve"],
  SAFETY_PPE: ["helmet", "gloves", "goggles", "ppe", "safety shoes", "ear muff"],
  LUBRICANT: ["oil", "grease", "lubricant", "lube"],
  WELD_ELECTRODE: ["electrode", "welding rod", "weld"],
  HAND_TOOL: ["spanner", "screwdriver", "plier", "hammer", "wrench", "tool"],
};

function classify(text: string): { code: string | null; score: number } {
  const lower = text.toLowerCase();
  let best: { code: string | null; score: number } = { code: null, score: 0 };
  for (const [code, kws] of Object.entries(classKeywords)) {
    let hits = 0;
    for (const kw of kws) if (lower.includes(kw)) hits++;
    const score = hits / kws.length;
    if (score > best.score) best = { code, score };
  }
  return best;
}

function extractNumbersNear(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern);
  return m ? m[1] : null;
}

const makeList = ["SKF", "FAG", "NSK", "NTN", "Timken", "Siemens", "ABB", "Festo", "SMC", "Parker", "Castrol", "Shell", "3M", "Honeywell", "Gates", "Fenner", "Unbrako"];

export function extractAttributes(freeText: string): ExtractionResult {
  const text = freeText.trim();
  if (!text) {
    return { classCode: null, taxonomyId: null, confidence: 0, values: {}, missingMandatory: [], notes: ["Enter a description to start."] };
  }

  const { code, score } = classify(text);
  const notes: string[] = [];
  if (!code) {
    return {
      classCode: null,
      taxonomyId: null,
      confidence: 0,
      values: {},
      missingMandatory: [],
      notes: ["Could not confidently classify this request — route to a steward for manual taxonomy assignment."],
    };
  }

  const cls = getClass(code)!;
  const taxonomyNode = taxonomyTree.find((n) => n.classCode === code);
  const values: Record<string, string> = {};
  const lower = text.toLowerCase();

  // manufacturer
  const foundMake = makeList.find((m) => lower.includes(m.toLowerCase()));
  if (foundMake) values.make = foundMake;

  if (code === "BALL_BEARING") {
    const series = extractNumbersNear(text, /\b(6\d{3})\b/);
    if (series) values.series = series;
    const bore = extractNumbersNear(text, /(\d{1,3})\s?(?:mm)?\s?(?:bore|x)/i);
    if (bore) values.bore = bore;
    if (/zz/i.test(text)) values.seal = "ZZ";
    else if (/2rs/i.test(text)) values.seal = "2RS";
    else if (/open/i.test(text)) values.seal = "OPEN";
    if (/\bball\b/i.test(text)) values.type = "Ball";
    else if (/roller/i.test(text)) values.type = "Roller";
  } else if (code === "HEX_BOLT") {
    const dia = extractNumbersNear(text, /m\s?(\d{1,2})/i);
    if (dia) values.diameter = dia;
    const len = extractNumbersNear(text, /x\s?(\d{1,4})/i);
    if (len) values.length = len;
    const grade = extractNumbersNear(text, /\b(8\.8|10\.9|12\.9|4\.6)\b/);
    if (grade) values.grade = grade;
  } else if (code === "AC_MOTOR") {
    const power = extractNumbersNear(text, /(\d+(?:\.\d+)?)\s?kw/i);
    if (power) values.power = power;
    const poles = extractNumbersNear(text, /(\d)\s?pole/i);
    if (poles) values.poles = poles;
  } else if (code === "VBELT") {
    const profile = extractNumbersNear(text, /\b(A|B|C|D|SPA|SPB|SPC)\b/);
    if (profile) values.profile = profile;
  }

  // fill mandatory fields that weren't found with a placeholder marker so the UI
  // can highlight exactly what the steward / requester still needs to confirm
  const missingMandatory: string[] = [];
  for (const ch of cls.characteristics) {
    if (ch.mandatory && !values[ch.fieldKey]) missingMandatory.push(ch.name);
  }

  const extractedCount = Object.keys(values).length;
  const totalFields = cls.characteristics.length;
  const confidence = Math.round(
    Math.min(97, 40 + score * 30 + (extractedCount / totalFields) * 30)
  );

  if (missingMandatory.length > 0) {
    notes.push(`${missingMandatory.length} mandatory field(s) need confirmation before this can go to duplicate check.`);
  }
  notes.push(`Classified as "${cls.name}" from keyword + pattern match (${Math.round(score * 100)}% keyword confidence).`);

  return {
    classCode: code,
    taxonomyId: taxonomyNode?.id ?? null,
    confidence,
    values,
    missingMandatory,
    notes,
  };
}

export function generateStandardDescription(cls: ClassDef, values: Record<string, string>): string {
  return renderDescription(cls.namingTemplate, cls.noun, values);
}

export function describeConfidence(score: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (score >= 80) return { label: "High confidence", tone: "good" };
  if (score >= 55) return { label: "Medium confidence — review", tone: "warn" };
  return { label: "Low confidence — manual entry recommended", tone: "bad" };
}
