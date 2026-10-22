import { classes, taxonomyTree, renderDescription, getClass } from "./taxonomy-data";

export type SeedMaterial = {
  materialNumber: string;
  description: string;
  taxonomyId: string;
  classCode: string;
  materialType: string;
  materialGroup: string;
  baseUom: string;
  manufacturer: string;
  mfrPartNo: string;
  plant: string;
  status: string;
  characteristics: Record<string, string>;
  createdOn: string;
  lastMovement: string | null;
  annualSpend: number;
  dqScore: number;
};

const plants = ["1000 - Mundra", "2000 - Behror", "3000 - Vijayawada", "4000 - Nalagarh"];

const makesByClass: Record<string, string[]> = {
  BALL_BEARING: ["SKF", "FAG", "NSK", "NTN", "Timken"],
  HEX_BOLT: ["Unbrako", "Sundram Fasteners", "GKW", "Lamons"],
  VBELT: ["Fenner", "Gates", "Continental", "Optibelt"],
  AC_MOTOR: ["Siemens", "ABB", "Crompton Greaves", "Havells", "Kirloskar"],
  HYD_CYLINDER: ["Yuken", "Parker", "Bosch Rexroth", "Hyva"],
  PNEUM_VALVE: ["Festo", "SMC", "Janatics", "Camozzi"],
  SAFETY_PPE: ["3M", "Honeywell", "MSA", "Karam"],
  LUBRICANT: ["Castrol", "Shell", "Servo", "Gulf"],
  WELD_ELECTRODE: ["D&H", "Ador Welding", "ESAB"],
  HAND_TOOL: ["Taparia", "Stanley", "Jk Files", "GEDORE"],
};

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function randInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 999.7) * 10000;
  const frac = x - Math.floor(x);
  return Math.floor(frac * (max - min + 1)) + min;
}

function pad(n: number, len: number): string {
  return n.toString().padStart(len, "0");
}

// Deterministic generator so the dataset is stable across reseeds (good for a live demo:
// results don't change between rehearsal and the real thing).
export function generateMaterials(): SeedMaterial[] {
  const out: SeedMaterial[] = [];
  let counter = 100001;
  let seed = 1;

  const leaf = taxonomyTree.filter((n) => n.classCode);

  for (const node of leaf) {
    const cls = getClass(node.classCode!)!;
    const makes = makesByClass[cls.code] ?? ["Generic"];
    const countForClass = cls.code === "BALL_BEARING" ? 16 : 10; // bearings get extra density incl. near-dupes

    for (let i = 0; i < countForClass; i++) {
      seed++;
      const values: Record<string, string> = {};
      for (const ch of cls.characteristics) {
        if (ch.fieldKey === "make") {
          values.make = pick(makes, i + randInt(seed, 0, 3));
          continue;
        }
        if (ch.dataType === "enum" && ch.enumValues) {
          values[ch.fieldKey] = pick(ch.enumValues, i + randInt(seed, 0, 5));
        } else if (ch.dataType === "number") {
          const base = cls.code === "BALL_BEARING" && ch.fieldKey === "bore" ? [15, 20, 25, 30, 35, 40, 45, 50] : null;
          if (base) {
            values[ch.fieldKey] = String(pick(base, i));
          } else if (cls.code === "BALL_BEARING" && ch.fieldKey === "od") {
            const bore = Number(values.bore ?? 25);
            values[ch.fieldKey] = String(bore + randInt(seed, 20, 30));
          } else if (cls.code === "BALL_BEARING" && ch.fieldKey === "width") {
            values[ch.fieldKey] = String(randInt(seed, 9, 20));
          } else {
            values[ch.fieldKey] = String(randInt(seed, 5, 400));
          }
        } else {
          if (cls.code === "BALL_BEARING" && ch.fieldKey === "series") {
            values[ch.fieldKey] = String(6200 + randInt(seed, 0, 14));
          } else {
            values[ch.fieldKey] = `${cls.noun}-${pad(i + 1, 2)}`;
          }
        }
      }

      const description = renderDescription(cls.namingTemplate, cls.noun, values);
      const matNo = pad(counter++, 8);
      const dqScore = randInt(seed, 62, 100);
      const createdDaysAgo = randInt(seed, 30, 1600);
      const created = new Date(Date.now() - createdDaysAgo * 86400000).toISOString().slice(0, 10);
      const hasMovement = randInt(seed, 0, 9) > 1;

      out.push({
        materialNumber: matNo,
        description,
        taxonomyId: node.id,
        classCode: cls.code,
        materialType: "ERSA",
        materialGroup: node.materialGroup ?? "MISC",
        baseUom: "EA",
        manufacturer: values.make ?? "",
        mfrPartNo: dqScore > 75 ? `${values.make?.slice(0, 3).toUpperCase()}-${pad(randInt(seed, 1000, 9999), 4)}` : "",
        plant: pick(plants, i + randInt(seed, 0, 3)),
        status: dqScore < 68 ? "Blocked" : "Active",
        characteristics: values,
        createdOn: created,
        lastMovement: hasMovement
          ? new Date(Date.now() - randInt(seed, 1, 400) * 86400000).toISOString().slice(0, 10)
          : null,
        annualSpend: Math.round(randInt(seed, 2, 480) * 1000 * (dqScore / 100)),
        dqScore,
      });
    }
  }

  // Deliberate near-duplicate pairs for the duplicate-check / AI similarity demo,
  // modeled directly on the client's own worked example (BRG SKF 6205 ZZ).
  const bearingNode = "bearings";
  const dupes: SeedMaterial[] = [
    {
      materialNumber: pad(counter++, 8),
      description: "BRG SKF 6205ZZ",
      taxonomyId: bearingNode,
      classCode: "BALL_BEARING",
      materialType: "ERSA",
      materialGroup: "MECH-BRG",
      baseUom: "EA",
      manufacturer: "SKF",
      mfrPartNo: "",
      plant: plants[0],
      status: "Active",
      characteristics: { type: "Ball", series: "6205", bore: "25", od: "52", width: "15", seal: "ZZ", make: "SKF" },
      createdOn: "2019-03-11",
      lastMovement: "2024-11-02",
      annualSpend: 184000,
      dqScore: 58,
    },
    {
      materialNumber: pad(counter++, 8),
      description: "BEARING 6205 ZZ SKF",
      taxonomyId: bearingNode,
      classCode: "BALL_BEARING",
      materialType: "ERSA",
      materialGroup: "MECH-BRG",
      baseUom: "EA",
      manufacturer: "SKF",
      mfrPartNo: "",
      plant: plants[1],
      status: "Active",
      characteristics: { type: "Ball", series: "6205", bore: "25", od: "52", width: "15", seal: "ZZ", make: "SKF" },
      createdOn: "2021-07-22",
      lastMovement: "2025-01-14",
      annualSpend: 96000,
      dqScore: 51,
    },
    {
      materialNumber: pad(counter++, 8),
      description: "SKF BEARING 6205-2RS",
      taxonomyId: bearingNode,
      classCode: "BALL_BEARING",
      materialType: "ERSA",
      materialGroup: "MECH-BRG",
      baseUom: "EA",
      manufacturer: "SKF",
      mfrPartNo: "SKF-6205-2RS",
      plant: plants[2],
      status: "Active",
      characteristics: { type: "Ball", series: "6205", bore: "25", od: "52", width: "15", seal: "2RS", make: "SKF" },
      createdOn: "2023-02-18",
      lastMovement: "2025-06-30",
      annualSpend: 142000,
      dqScore: 83,
    },
  ];

  return [...out, ...dupes];
}
