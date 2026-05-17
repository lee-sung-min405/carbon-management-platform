import { NextResponse } from "next/server";

// GET /api/products/[id]/calculation-runs — list past calculation runs
// Implemented in Commit 9.
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
