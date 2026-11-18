import { NextResponse } from "next/server.js";
import type { NextRequest } from "next/server.js";
import { AuthService } from "../../../../../server/services/authService.ts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await AuthService.login(body);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Invalid authentication credentials" },
      { status: 401 }
    );
  }
}
