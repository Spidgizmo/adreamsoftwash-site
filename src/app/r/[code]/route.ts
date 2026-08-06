import { NextRequest, NextResponse } from "next/server";

const REFERRAL_CODE_PATTERN = /^ADS-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function GET(
  request: NextRequest,
  { params }: { params: { code: string } },
) {
  const normalizedCode = params.code.trim().toUpperCase();
  const destination = new URL("/bin-cleaning/signup", request.url);

  if (REFERRAL_CODE_PATTERN.test(normalizedCode)) {
    destination.searchParams.set("ref", normalizedCode);
  }

  return NextResponse.redirect(destination, 307);
}
