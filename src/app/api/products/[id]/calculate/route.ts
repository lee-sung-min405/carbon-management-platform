import { NextResponse } from "next/server";

// POST /api/products/[id]/calculate — run PCF calculation and persist CalculationRun
// Implemented in Commit 9.
export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
