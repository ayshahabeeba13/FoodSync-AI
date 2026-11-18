import { NextResponse } from "next/server.js";
import type { NextRequest } from "next/server.js";
import { AuthService } from "../../../../../server/services/authService.ts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await AuthService.register(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const message = error.message || "Failed registering account";
    const status = message.startsWith("CONFLICT") ? 409 : message.startsWith("VALIDATION") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
