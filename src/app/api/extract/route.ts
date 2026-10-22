import { NextRequest, NextResponse } from "next/server";
import { extractAttributes } from "@/lib/ai-engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const freeText = (body?.freeText ?? "").toString();
  const result = extractAttributes(freeText);
  return NextResponse.json(result);
}
