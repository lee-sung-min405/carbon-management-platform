import { NextResponse } from "next/server";

// PUT    /api/activities/[id] — update activity
// DELETE /api/activities/[id] — delete activity
// Implemented in Commit 8.
export async function PUT() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
