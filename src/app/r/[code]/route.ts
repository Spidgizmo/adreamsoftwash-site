import { NextRequest, NextResponse } from "next/server";

const REFERRAL_CODE_PATTERN = /^ADS-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();
  const destination = new URL("/bin-cleaning/signup", request.url);

  if (REFERRAL_CODE_PATTERN.test(normalizedCode)) {
    destination.searchParams.set("ref", normalizedCode);
  }

  return NextResponse.redirect(destination, 307);
}
