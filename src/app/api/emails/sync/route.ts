import { NextResponse } from "next/server";
import { imapConfigured, syncEmails } from "@/lib/imapSync";

export async function POST() {
  if (!(await imapConfigured())) {
    return NextResponse.json(
      { error: "No hay ninguna cuenta de email activa configurada." },
      { status: 400 }
    );
  }
  try {
    const result = await syncEmails();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
