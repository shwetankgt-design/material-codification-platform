export type Material = {
  material_number: string;
  description: string;
  taxonomy_id: string;
  class_code: string;
  material_type: string;
  material_group: string;
  base_uom: string;
  manufacturer: string;
  mfr_part_no: string;
  plant: string;
  status: string;
  characteristics_json: string;
  created_on: string;
  last_movement: string | null;
  annual_spend: number;
  dq_score: number;
};

export type RequestRow = {
  id: string;
  free_text: string;
  requester_id: string;
  taxonomy_id: string | null;
  class_code: string | null;
  characteristics_json: string;
  manufacturer: string | null;
  mfr_part_no: string | null;
  generated_description: string | null;
  status: string;
  duplicate_decision: string | null;
  reused_material_number: string | null;
  ai_confidence: number | null;
  sap_material_number: string | null;
  priority: string;
  plant: string | null;
  created_at: string;
  updated_at: string;
  sla_due_at: string | null;
};

export type User = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  plant: string | null;
};
