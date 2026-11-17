import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { endSession } from "@/lib/session";

export async function POST() {
  await endSession();
  return NextResponse.redirect(new URL("/login", config.appUrl), 303);
}
