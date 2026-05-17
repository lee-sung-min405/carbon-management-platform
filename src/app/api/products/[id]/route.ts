import { NextResponse } from "next/server";

// GET /api/products/[id] — product detail with activities
// Implemented in Commit 7.
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
