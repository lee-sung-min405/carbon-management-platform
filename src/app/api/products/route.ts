import { NextResponse } from "next/server";

// GET  /api/products       — list products
// POST /api/products       — create product
// Implemented in Commit 7.
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
