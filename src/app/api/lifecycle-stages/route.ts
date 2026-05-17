import { NextResponse } from "next/server";

// GET /api/lifecycle-stages — list lifecycle stages
// Implemented in Commit 7.
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
