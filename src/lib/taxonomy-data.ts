// Taxonomy + classification metadata — this is config, not hardcoded UI,
// so adding a new category/class means adding data here, not new screens.

export type Characteristic = {
  name: string;
  fieldKey: string;
  dataType: "text" | "number" | "enum";
  unit?: string;
  mandatory: boolean;
  enumValues?: string[];
};

export type ClassDef = {
  code: string;
  name: string;
  noun: string;
  namingTemplate: string; // tokens reference characteristic fieldKeys, e.g. {noun} {modifier} {bore}
  characteristics: Characteristic[];
};

export type TaxonomyNode = {
  id: string;
  parentId: string | null;
  name: string;
  level: number;
  classCode?: string;
  materialGroup?: string;
};

export const classes: ClassDef[] = [
  {
    code: "BALL_BEARING",
    name: "Ball Bearing",
    noun: "BEARING",
    namingTemplate: "{noun} {type} {series} {seal} {make}",
    characteristics: [
      { name: "Bearing Type", fieldKey: "type", dataType: "enum", mandatory: true, enumValues: ["Ball", "Roller", "Thrust", "Angular Contact"] },
      { name: "Series / Model", fieldKey: "series", dataType: "text", mandatory: true },
      { name: "Bore Diameter", fieldKey: "bore", dataType: "number", unit: "mm", mandatory: true },
      { name: "Outer Diameter", fieldKey: "od", dataType: "number", unit: "mm", mandatory: true },
      { name: "Width", fieldKey: "width", dataType: "number", unit: "mm", mandatory: true },
      { name: "Seal Type", fieldKey: "seal", dataType: "enum", mandatory: true, enumValues: ["ZZ", "2RS", "OPEN", "RS"] },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: true },
    ],
  },
  {
    code: "HEX_BOLT",
    name: "Hex Bolt / Fastener",
    noun: "BOLT",
    namingTemplate: "{noun} HEX {grade} M{diameter}X{length} {finish}",
    characteristics: [
      { name: "Grade", fieldKey: "grade", dataType: "enum", mandatory: true, enumValues: ["8.8", "10.9", "12.9", "4.6"] },
      { name: "Diameter", fieldKey: "diameter", dataType: "number", unit: "mm", mandatory: true },
      { name: "Length", fieldKey: "length", dataType: "number", unit: "mm", mandatory: true },
      { name: "Thread Pitch", fieldKey: "pitch", dataType: "number", unit: "mm", mandatory: false },
      { name: "Finish", fieldKey: "finish", dataType: "enum", mandatory: true, enumValues: ["Zinc Plated", "Black Oxide", "Plain", "Hot Dip Galvanized"] },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: false },
    ],
  },
  {
    code: "VBELT",
    name: "V-Belt",
    noun: "BELT",
    namingTemplate: "{noun} V-TYPE {profile} {length} {make}",
    characteristics: [
      { name: "Profile", fieldKey: "profile", dataType: "enum", mandatory: true, enumValues: ["A", "B", "C", "D", "SPA", "SPB", "SPC"] },
      { name: "Length", fieldKey: "length", dataType: "number", unit: "mm", mandatory: true },
      { name: "Top Width", fieldKey: "width", dataType: "number", unit: "mm", mandatory: false },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: true },
    ],
  },
  {
    code: "AC_MOTOR",
    name: "AC Induction Motor",
    noun: "MOTOR",
    namingTemplate: "{noun} AC {power}KW {poles}P {frame} {make}",
    characteristics: [
      { name: "Power Rating", fieldKey: "power", dataType: "number", unit: "kW", mandatory: true },
      { name: "Pole Count", fieldKey: "poles", dataType: "enum", mandatory: true, enumValues: ["2", "4", "6", "8"] },
      { name: "Frame Size", fieldKey: "frame", dataType: "text", mandatory: true },
      { name: "Voltage", fieldKey: "voltage", dataType: "enum", mandatory: true, enumValues: ["415V", "230V", "690V"] },
      { name: "Mounting", fieldKey: "mounting", dataType: "enum", mandatory: false, enumValues: ["Foot", "Flange", "Foot-Flange"] },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: true },
    ],
  },
  {
    code: "HYD_CYLINDER",
    name: "Hydraulic Cylinder",
    noun: "CYLINDER",
    namingTemplate: "{noun} HYD {bore}X{stroke} {pressure} {make}",
    characteristics: [
      { name: "Bore", fieldKey: "bore", dataType: "number", unit: "mm", mandatory: true },
      { name: "Stroke", fieldKey: "stroke", dataType: "number", unit: "mm", mandatory: true },
      { name: "Pressure Rating", fieldKey: "pressure", dataType: "enum", mandatory: true, enumValues: ["160bar", "210bar", "250bar", "350bar"] },
      { name: "Mounting Type", fieldKey: "mounting", dataType: "enum", mandatory: false, enumValues: ["Clevis", "Flange", "Trunnion"] },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: true },
    ],
  },
  {
    code: "PNEUM_VALVE",
    name: "Pneumatic Solenoid Valve",
    noun: "VALVE",
    namingTemplate: "{noun} SOLENOID {port} {voltage} {make}",
    characteristics: [
      { name: "Port Size", fieldKey: "port", dataType: "enum", mandatory: true, enumValues: ["1/4\"", "3/8\"", "1/2\"", "3/4\""] },
      { name: "Voltage", fieldKey: "voltage", dataType: "enum", mandatory: true, enumValues: ["24VDC", "230VAC", "110VAC"] },
      { name: "Configuration", fieldKey: "config", dataType: "enum", mandatory: false, enumValues: ["3/2 NC", "5/2", "5/3"] },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: true },
    ],
  },
  {
    code: "SAFETY_PPE",
    name: "Personal Protective Equipment",
    noun: "PPE",
    namingTemplate: "{noun} {item} {standard} SIZE-{size} {make}",
    characteristics: [
      { name: "Item", fieldKey: "item", dataType: "enum", mandatory: true, enumValues: ["Safety Helmet", "Safety Gloves", "Safety Goggles", "Ear Muff", "Safety Shoes"] },
      { name: "Standard", fieldKey: "standard", dataType: "text", mandatory: true },
      { name: "Size", fieldKey: "size", dataType: "enum", mandatory: false, enumValues: ["S", "M", "L", "XL", "Free"] },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: false },
    ],
  },
  {
    code: "LUBRICANT",
    name: "Industrial Lubricant",
    noun: "LUBRICANT",
    namingTemplate: "{noun} {type} {grade} {pack} {make}",
    characteristics: [
      { name: "Type", fieldKey: "type", dataType: "enum", mandatory: true, enumValues: ["Gear Oil", "Hydraulic Oil", "Grease", "Chain Oil"] },
      { name: "Grade", fieldKey: "grade", dataType: "text", mandatory: true },
      { name: "Pack Size", fieldKey: "pack", dataType: "enum", mandatory: true, enumValues: ["1L", "5L", "20L", "210L", "180KG"] },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: true },
    ],
  },
  {
    code: "WELD_ELECTRODE",
    name: "Welding Electrode",
    noun: "ELECTRODE",
    namingTemplate: "{noun} {type} {diameter}MM {make}",
    characteristics: [
      { name: "Type", fieldKey: "type", dataType: "enum", mandatory: true, enumValues: ["E6013", "E7018", "ER70S-6"] },
      { name: "Diameter", fieldKey: "diameter", dataType: "number", unit: "mm", mandatory: true },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: true },
    ],
  },
  {
    code: "HAND_TOOL",
    name: "Hand Tool",
    noun: "TOOL",
    namingTemplate: "{noun} {item} {size} {make}",
    characteristics: [
      { name: "Item", fieldKey: "item", dataType: "enum", mandatory: true, enumValues: ["Spanner Set", "Screwdriver", "Plier", "Hammer", "Wrench"] },
      { name: "Size", fieldKey: "size", dataType: "text", mandatory: false },
      { name: "Manufacturer", fieldKey: "make", dataType: "text", mandatory: false },
    ],
  },
];

export const taxonomyTree: TaxonomyNode[] = [
  { id: "indirect", parentId: null, name: "Indirect Material", level: 0 },
  { id: "spares", parentId: "indirect", name: "Spare Parts", level: 1 },
  { id: "mechanical", parentId: "spares", name: "Mechanical", level: 2 },
  { id: "electrical", parentId: "spares", name: "Electrical", level: 2 },
  { id: "hydraulics_pneumatics", parentId: "spares", name: "Hydraulics & Pneumatics", level: 2 },
  { id: "consumables", parentId: "indirect", name: "Consumables", level: 1 },
  { id: "safety", parentId: "indirect", name: "Safety & PPE", level: 1 },

  { id: "bearings", parentId: "mechanical", name: "Bearings", level: 3, classCode: "BALL_BEARING", materialGroup: "MECH-BRG" },
  { id: "fasteners", parentId: "mechanical", name: "Fasteners", level: 3, classCode: "HEX_BOLT", materialGroup: "MECH-FAS" },
  { id: "belts", parentId: "mechanical", name: "Power Transmission Belts", level: 3, classCode: "VBELT", materialGroup: "MECH-BLT" },
  { id: "hand_tools", parentId: "mechanical", name: "Hand Tools", level: 3, classCode: "HAND_TOOL", materialGroup: "MECH-TL" },

  { id: "motors", parentId: "electrical", name: "Motors", level: 3, classCode: "AC_MOTOR", materialGroup: "ELEC-MOT" },

  { id: "cylinders", parentId: "hydraulics_pneumatics", name: "Hydraulic Cylinders", level: 3, classCode: "HYD_CYLINDER", materialGroup: "HYD-CYL" },
  { id: "valves", parentId: "hydraulics_pneumatics", name: "Pneumatic Valves", level: 3, classCode: "PNEUM_VALVE", materialGroup: "PNU-VLV" },

  { id: "lubricants", parentId: "consumables", name: "Lubricants", level: 2, classCode: "LUBRICANT", materialGroup: "CONS-LUB" },
  { id: "welding", parentId: "consumables", name: "Welding Consumables", level: 2, classCode: "WELD_ELECTRODE", materialGroup: "CONS-WLD" },

  { id: "ppe", parentId: "safety", name: "Personal Protective Equipment", level: 2, classCode: "SAFETY_PPE", materialGroup: "SAFE-PPE" },
];

export function getClass(code: string): ClassDef | undefined {
  return classes.find((c) => c.code === code);
}

export function leafNodes(): TaxonomyNode[] {
  return taxonomyTree.filter((n) => !!n.classCode);
}

export function nodePath(id: string): TaxonomyNode[] {
  const path: TaxonomyNode[] = [];
  let node: TaxonomyNode | undefined = taxonomyTree.find((n) => n.id === id);
  while (node) {
    path.unshift(node);
    node = node.parentId ? taxonomyTree.find((n) => n.id === node!.parentId) : undefined;
  }
  return path;
}

export function renderDescription(template: string, noun: string, values: Record<string, string>): string {
  let out = template.replace("{noun}", noun);
  out = out.replace(/\{(\w+)\}/g, (_, key) => (values[key] ?? "").toString().toUpperCase());
  return out.replace(/\s+/g, " ").trim();
}
