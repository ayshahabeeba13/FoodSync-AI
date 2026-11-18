import { NextResponse } from "next/server.js";
import type { NextRequest } from "next/server.js";
import { AuthService } from "../../../../../server/services/authService.ts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.targetUserId) {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }

    const result = await AuthService.switchDemoRole(body.targetUserId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const isForbidden = error.message?.includes("FORBIDDEN");
    return NextResponse.json(
      { error: error.message || "Failed switching role" },
      { status: isForbidden ? 403 : 400 }
    );
  }
}
