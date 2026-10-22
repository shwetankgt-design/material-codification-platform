import { NextRequest, NextResponse } from "next/server";
import { templateColumns, templateSampleRow } from "@/lib/import-validation";
import { toCsv } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const classCode = new URL(req.url).searchParams.get("class");
  if (!classCode) return NextResponse.json({ error: "class is required" }, { status: 400 });

  const columns = templateColumns(classCode);
  if (columns.length === 0) return NextResponse.json({ error: "Unknown class" }, { status: 400 });

  const csv = toCsv(columns, [templateSampleRow(classCode)]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${classCode}_import_template.csv"`,
    },
  });
}
