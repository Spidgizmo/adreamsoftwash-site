import { cookies } from "next/headers";
import type { AppRole } from "@/lib/bin-cleaning/domain";

const ACCESS_COOKIE = "ads-test-access";
const REFRESH_COOKIE = "ads-test-refresh";
export type SessionUser = { id: string; email: string; role: AppRole };
function config() { const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if(!url||!key) throw new Error("Test Supabase is not configured"); return {url,key}; }
export async function authRequest(path:string, init:RequestInit={}) { const {url,key}=config(); return fetch(`${url}/auth/v1/${path}`,{...init,headers:{apikey:key,"Content-Type":"application/json",...init.headers},cache:"no-store"}); }
export async function databaseRequest<T>(path:string, init:RequestInit={}, suppliedToken?:string) { const {url,key}=config(); const token=suppliedToken??cookies().get(ACCESS_COOKIE)?.value; if(!token) throw new Error("Authentication required"); const response=await fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=representation",...init.headers},cache:"no-store"}); if(!response.ok) throw new Error(`Database request failed (${response.status}): ${await response.text()}`); return response.status===204 ? ([] as T) : await response.json() as T; }
async function profileRole(userId:string,token?:string):Promise<AppRole>{ const roles=await databaseRequest<{role:AppRole}[]>(`staff_roles?user_id=eq.${userId}&revoked_at=is.null&select=role`,{},token); return roles[0]?.role??"customer"; }
export async function sessionFromToken(token:string):Promise<SessionUser|null>{try{const response=await authRequest("user",{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)return null;const user=await response.json() as {id:string;email?:string};return {id:user.id,email:user.email??"",role:await profileRole(user.id,token)};}catch{return null;}}
export async function currentSession():Promise<SessionUser|null>{const token=cookies().get(ACCESS_COOKIE)?.value;return token?sessionFromToken(token):null;}
export function storeSession(value:{access_token:string;refresh_token:string;expires_in:number}) { const options={httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:value.expires_in}; cookies().set(ACCESS_COOKIE,value.access_token,options);cookies().set(REFRESH_COOKIE,value.refresh_token,{...options,maxAge:60*60*24*7}); }
export function clearSession(){cookies().delete(ACCESS_COOKIE);cookies().delete(REFRESH_COOKIE);}
export function destinationForRole(role:AppRole){return role==="customer"?"/bin-cleaning/portal":role==="field_technician"?"/bin-cleaning/field/visits/assigned":"/bin-cleaning/crm";}
