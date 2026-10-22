import { NextResponse } from "next/server";
import { taxonomyTree, classes } from "@/lib/taxonomy-data";
import { getDb } from "@/lib/db";
import type { Material } from "@/lib/types";

export async function GET() {
  const db = getDb();
  const counts = db
    .prepare("SELECT taxonomy_id, COUNT(*) as c FROM materials GROUP BY taxonomy_id")
    .all() as { taxonomy_id: string; c: number }[];
  const countMap = Object.fromEntries(counts.map((c) => [c.taxonomy_id, c.c]));

  return NextResponse.json({
    nodes: taxonomyTree.map((n) => ({ ...n, materialCount: countMap[n.id] ?? 0 })),
    classes,
  });
}
