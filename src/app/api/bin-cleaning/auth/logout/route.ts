import { NextRequest,NextResponse } from "next/server";import { clearSession } from "@/lib/supabase/server";
export async function POST(request:NextRequest){clearSession();return NextResponse.redirect(new URL("/bin-cleaning/login?logged_out=1",request.url),303);}
