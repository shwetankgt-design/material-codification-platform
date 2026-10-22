import { getClass, renderDescription, taxonomyTree } from "./taxonomy-data";

export type ImportRowResult = {
  rowNumber: number;
  raw: Record<string, string>;
  values: Record<string, string>;
  manufacturer: string;
  mfrPartNo: string;
  plant: string;
  description: string;
  dqScore: number;
  errors: string[];
};

const validPlants = ["1000 - Mundra", "2000 - Behror", "3000 - Vijayawada", "4000 - Nalagarh"];

export function templateColumns(classCode: string): string[] {
  const cls = getClass(classCode);
  if (!cls) return [];
  const charCols = cls.characteristics.filter((c) => c.fieldKey !== "make").map((c) => c.fieldKey);
  return ["manufacturer", "mfr_part_no", "plant", ...charCols];
}

export function templateSampleRow(classCode: string): string[] {
  const cls = getClass(classCode);
  if (!cls) return [];
  return templateColumns(classCode).map((col) => {
    if (col === "manufacturer") return "SKF";
    if (col === "mfr_part_no") return "SKF-6205-ZZ";
    if (col === "plant") return validPlants[0];
    const ch = cls.characteristics.find((c) => c.fieldKey === col);
    if (!ch) return "";
    if (ch.enumValues) return ch.enumValues[0];
    if (ch.dataType === "number") return "25";
    return "SAMPLE";
  });
}

export function validateRow(classCode: string, raw: Record<string, string>, rowNumber: number): ImportRowResult {
  const cls = getClass(classCode);
  const errors: string[] = [];
  const values: Record<string, string> = {};

  if (!cls) {
    return {
      rowNumber,
      raw,
      values: {},
      manufacturer: "",
      mfrPartNo: "",
      plant: "",
      description: "",
      dqScore: 0,
      errors: [`Unknown class code "${classCode}"`],
    };
  }

  const manufacturer = (raw.manufacturer ?? "").trim();
  const mfrPartNo = (raw.mfr_part_no ?? "").trim();
  const plant = (raw.plant ?? "").trim();

  if (!manufacturer) errors.push("manufacturer is required");
  if (!plant) errors.push("plant is required");
  else if (!validPlants.includes(plant)) errors.push(`plant "${plant}" is not a recognized plant code`);

  for (const ch of cls.characteristics) {
    if (ch.fieldKey === "make") continue;
    const raw_v = (raw[ch.fieldKey] ?? "").trim();
    if (ch.mandatory && !raw_v) {
      errors.push(`${ch.name} (${ch.fieldKey}) is mandatory`);
      continue;
    }
    if (raw_v && ch.dataType === "number" && isNaN(Number(raw_v))) {
      errors.push(`${ch.name} must be numeric, got "${raw_v}"`);
      continue;
    }
    if (raw_v && ch.dataType === "enum" && ch.enumValues && !ch.enumValues.map((v) => v.toLowerCase()).includes(raw_v.toLowerCase())) {
      errors.push(`${ch.name} must be one of: ${ch.enumValues.join(", ")} — got "${raw_v}"`);
      continue;
    }
    if (raw_v) values[ch.fieldKey] = raw_v;
  }
  if (manufacturer) values.make = manufacturer;

  const mandatoryCount = cls.characteristics.filter((c) => c.mandatory).length + 2; // + manufacturer + MPN
  const presentCount =
    cls.characteristics.filter((c) => c.mandatory && values[c.fieldKey]).length + (manufacturer ? 1 : 0) + (mfrPartNo ? 1 : 0);
  const dqScore = Math.round((presentCount / mandatoryCount) * 100);

  const description = errors.length === 0 ? renderDescription(cls.namingTemplate, cls.noun, values) : "";

  return { rowNumber, raw, values, manufacturer, mfrPartNo, plant, description, dqScore, errors };
}

export function taxonomyIdForClass(classCode: string): string | null {
  return taxonomyTree.find((n) => n.classCode === classCode)?.id ?? null;
}

export { validPlants };
