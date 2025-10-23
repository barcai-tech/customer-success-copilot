import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId, sessionId } = auth();
  const cookieHeader = req.headers.get("cookie") || "";
  return new Response(
    JSON.stringify({ ok: true, userId: userId ?? null, sessionId: sessionId ?? null, cookiePreview: cookieHeader.slice(0, 200) }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}

