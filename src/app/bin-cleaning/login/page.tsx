"use client";
import { FormEvent, useState } from "react";
import { TestBanner } from "@/components/bin-cleaning/AppShell";

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; error_description?: string; msg?: string };
export default function LoginPage() {
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault(); setBusy(true); setMessage("");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key){setMessage("Local Supabase is not configured. Follow docs/AGENT-2-SETUP.md; production signup remains disabled.");setBusy(false);return;}
  const data=new FormData(event.currentTarget);
  try { const response=await fetch(`${url}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email:data.get("email"),password:data.get("password")})}); const token=await response.json() as TokenResponse;
   if(!response.ok||!token.access_token) throw new Error(token.error_description??token.msg??"Test sign-in failed.");
   sessionStorage.setItem("ads_bin_cleaning_test_session",JSON.stringify({accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:Date.now()+(token.expires_in??3600)*1000}));
   window.location.assign("/bin-cleaning/portal");
  } catch(error){setMessage(error instanceof Error?error.message:"Test sign-in failed.");setBusy(false);}
 }
 return <><TestBanner/><main className="mx-auto max-w-md px-4 py-16"><h1 className="text-3xl font-black">Test account sign in</h1><p className="mt-3 text-zinc-600">Supabase Auth accepts only fictional users seeded into the local test database.</p><form onSubmit={submit} className="card mt-8 space-y-5 p-6"><label className="block font-semibold">Email<input required type="email" name="email" autoComplete="email" className="mt-2 w-full rounded-lg border p-3" placeholder="customer@example.test"/></label><label className="block font-semibold">Password<input required minLength={8} type="password" name="password" autoComplete="current-password" className="mt-2 w-full rounded-lg border p-3"/></label><button disabled={busy} className="w-full rounded-lg bg-brand-700 p-3 font-bold text-white disabled:bg-zinc-400" type="submit">{busy?"Signing in…":"Sign in to test environment"}</button>{message&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}</form></main></>;
}
