import { NextResponse } from "next/server";

// POST /api/products/[id]/activities — add activity to product
// Implemented in Commit 8.
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
