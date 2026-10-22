import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildTfIdfModel, editSimilarity, tokenSetSimilarity, scoreAttributeOverlap, explainMatch } from "@/lib/similarity";
import type { RequestRow, Material } from "@/lib/types";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const reqRow = db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as RequestRow | undefined;
  if (!reqRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const candidates = db
    .prepare("SELECT * FROM materials WHERE class_code = ? AND status != 'Marked for Deletion'")
    .all(reqRow.class_code) as Material[];

  const queryText = reqRow.generated_description || reqRow.free_text;
  const corpus = candidates.map((m) => ({ id: m.material_number, text: m.description }));
  const tfidf = buildTfIdfModel(corpus.length ? corpus : [{ id: "_none", text: queryText }]);
  const tfidfScores = new Map(tfidf.scoreAgainstCorpus(queryText).map((s) => [s.id, s.score]));

  const reqChars = JSON.parse(reqRow.characteristics_json) as Record<string, string>;

  const scored = candidates.map((m) => {
    const editScore = editSimilarity(queryText, m.description);
    const tokenScore = tokenSetSimilarity(queryText, m.description);
    const tfidfScore = tfidfScores.get(m.material_number) ?? 0;
    const attrScore = scoreAttributeOverlap(reqChars, JSON.parse(m.characteristics_json));
    const blended = editScore * 0.25 + tokenScore * 0.25 + tfidfScore * 0.2 + attrScore * 0.3;
    return {
      materialNumber: m.material_number,
      description: m.description,
      manufacturer: m.manufacturer,
      plant: m.plant,
      editScore,
      tokenScore,
      tfidfScore,
      attributeScore: attrScore,
      blendedScore: blended,
      matchReason: explainMatch(editScore, tokenScore, attrScore),
    };
  });

  scored.sort((a, b) => b.blendedScore - a.blendedScore);
  const top = scored.filter((s) => s.blendedScore > 0.3).slice(0, 5);

  db.prepare("DELETE FROM request_matches WHERE request_id = ?").run(id);
  const insert = db.prepare(
    "INSERT INTO request_matches (request_id, material_number, similarity_score, match_reason) VALUES (?,?,?,?)"
  );
  const tx = db.transaction(() => {
    for (const t of top) insert.run(id, t.materialNumber, t.blendedScore, t.matchReason);
  });
  tx();

  const status = top.some((t) => t.blendedScore > 0.55) ? "Duplicate Review" : "Pending Approval";
  const now = new Date().toISOString();
  db.prepare("UPDATE requests SET status=?, updated_at=? WHERE id=?").run(status, now, id);
  db.prepare(`INSERT INTO audit_log (request_id, actor_id, actor_name, action, detail, created_at) VALUES (?,?,?,?,?,?)`).run(
    id, "system", "AI Duplicate Engine", "Duplicate Check Run",
    `${top.length} candidate(s) found, top score ${top[0] ? Math.round(top[0].blendedScore * 100) : 0}%`, now
  );

  return NextResponse.json({ matches: top, status });
}
