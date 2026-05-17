import { NextResponse } from "next/server";

// GET /api/emission-factors?stage=TRANSPORT — list emission factors
// Implemented in Commit 7.
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
