import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentSession, databaseRequest } from "@/lib/supabase/server";

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }
function integer(form: FormData, key: string) { const value = Number(text(form, key)); return Number.isSafeInteger(value) ? value : Number.NaN; }
function safeId(value: string) { return /^[0-9a-f-]{36}$/i.test(value) ? value : null; }
function jsonBody(value: unknown): RequestInit { return { method: "PATCH", body: JSON.stringify(value), headers: { Prefer: "return=minimal" } }; }
async function syncBins(addressId: string, stream: "trash" | "recycling", desired: number) {
  const existing = await databaseRequest<{ id: string }[]>(`bins?service_address_id=eq.${addressId}&collection_stream=eq.${stream}&active=eq.true&select=id&order=id`);
  if (existing.length > desired) for (const bin of existing.slice(desired)) await databaseRequest(`bins?id=eq.${bin.id}`, jsonBody({ active: false }));
  else if (existing.length < desired) for (let index = existing.length; index < desired; index += 1) await databaseRequest("bins", { method: "POST", body: JSON.stringify({ service_address_id: addressId, collection_stream: stream, description: `${stream === "trash" ? "Trash" : "Recycling"} bin ${index + 1}`, active: true }), headers: { Prefer: "return=minimal" } });
}
export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session || !["administrator", "dispatcher"].includes(session.role)) return NextResponse.json({ ok: false }, { status: 403 });
  const form = await request.formData(); const customerId = safeId(text(form, "customer_id")); const addressId = safeId(text(form, "address_id"));
  if (!customerId || !addressId) return NextResponse.json({ ok: false }, { status: 400 });
  const fullName=text(form,"full_name").slice(0,120), email=text(form,"email").slice(0,180), phone=text(form,"phone").slice(0,32), accountStatus=text(form,"account_status").slice(0,40)||"test_pending";
  const cancellationReason=text(form,"cancellation_reason").slice(0,80), moveOutDate=text(form,"move_out_date"), serviceThroughDate=text(form,"service_through_date");
  const line1=text(form,"line1").slice(0,180), line2=text(form,"line2").slice(0,80), city=text(form,"city").slice(0,100), region=text(form,"region").toUpperCase().slice(0,2), postalCode=text(form,"postal_code").slice(0,12);
  const returnLocation=text(form,"preferred_return_location").slice(0,180), accessInstructions=text(form,"access_instructions").slice(0,1000), gateInformation=text(form,"gate_information").slice(0,500), animalWarning=text(form,"animal_warning").slice(0,500);
  const planId=text(form,"plan_id"), trashBins=integer(form,"trash_bins"), recyclingBins=integer(form,"recycling_bins"), trashWeekday=integer(form,"trash_weekday"), recyclingWeekday=integer(form,"recycling_weekday"), recyclingFrequency=integer(form,"recycling_frequency_weeks"), recyclingAnchor=text(form,"recycling_anchor_collection_date"), staffNote=text(form,"staff_note").slice(0,1500);
  const datePattern=/^\d{4}-\d{2}-\d{2}$/;
  if (!fullName||!email||!line1||!city||!/^[A-Z]{2}$/.test(region)||postalCode.length<5||!Number.isInteger(trashBins)||!Number.isInteger(recyclingBins)||trashBins<0||recyclingBins<0||trashBins+recyclingBins<1||trashBins+recyclingBins>20||(cancellationReason==="moved"&&!datePattern.test(moveOutDate))) return NextResponse.redirect(new URL(`/bin-cleaning/crm/customers/${customerId}?error=validation`,request.url),303);
  await databaseRequest(`customers?id=eq.${customerId}`,jsonBody({full_name:fullName,email,phone:phone||null,account_status:accountStatus,cancellation_reason:cancellationReason||null,move_out_date:cancellationReason==="moved"?moveOutDate:null,service_through_date:serviceThroughDate&&datePattern.test(serviceThroughDate)?serviceThroughDate:(cancellationReason==="moved"?moveOutDate:null)}));
  const normalized=`${line1}|${line2}|${city}|${region}|${postalCode}`.toLowerCase().replace(/\s+/g," ").trim(); const normalizedHash=createHash("sha256").update(normalized).digest("hex");
  await databaseRequest(`service_addresses?id=eq.${addressId}`,jsonBody({line1,line2:line2||null,city,region,postal_code:postalCode,normalized_address_hash:normalizedHash,preferred_return_location:returnLocation||null,access_instructions:accessInstructions||null,gate_information:gateInformation||null,animal_warning:animalWarning||null}));
  if(cancellationReason==="moved") {
    const prior=await databaseRequest<{id:string}[]>(`service_address_occupancy_history?customer_id=eq.${customerId}&service_address_id=eq.${addressId}&occupancy_ended_on=eq.${moveOutDate}&select=id&limit=1`);
    if(!prior[0]) await databaseRequest("service_address_occupancy_history",{method:"POST",body:JSON.stringify({customer_id:customerId,service_address_id:addressId,occupancy_ended_on:moveOutDate,end_reason:"moved",created_by:session.id}),headers:{Prefer:"return=minimal"}});
    await databaseRequest(`service_visits?service_address_id=eq.${addressId}&scheduled_service_date=gt.${serviceThroughDate&&datePattern.test(serviceThroughDate)?serviceThroughDate:moveOutDate}&status=in.(scheduled,planned,pending)&select=id`,{method:"GET"}).then(async(rows:any)=>{for(const row of rows) await databaseRequest(`service_visits?id=eq.${row.id}`,jsonBody({status:"canceled"}));}).catch(()=>undefined);
  }
  await syncBins(addressId,"trash",trashBins); await syncBins(addressId,"recycling",recyclingBins);
  if(Number.isInteger(trashWeekday)&&trashWeekday>=0&&trashWeekday<=6){const schedules=await databaseRequest<{id:string}[]>(`trash_pickup_schedules?service_address_id=eq.${addressId}&effective_to=is.null&select=id&limit=1`);if(schedules[0])await databaseRequest(`trash_pickup_schedules?id=eq.${schedules[0].id}`,jsonBody({weekday:trashWeekday,customer_reported_weekday:trashWeekday,source:"staff_verified",verification_status:"staff_verified"}));}
  if(recyclingBins>0&&Number.isInteger(recyclingWeekday)&&recyclingWeekday>=0&&recyclingWeekday<=6&&[1,2].includes(recyclingFrequency)&&datePattern.test(recyclingAnchor)){const schedules=await databaseRequest<{id:string}[]>(`recycling_pickup_schedules?service_address_id=eq.${addressId}&is_current=eq.true&select=id&limit=1`);if(schedules[0])await databaseRequest(`recycling_pickup_schedules?id=eq.${schedules[0].id}`,jsonBody({weekday:recyclingWeekday,frequency_weeks:recyclingFrequency,anchor_collection_date:recyclingAnchor,source:"staff_verified",verification_status:"staff_verified"}));}
  const subscriptionId=safeId(text(form,"subscription_id")); if(subscriptionId&&["monthly","quarterly","twice-yearly","one-time"].includes(planId)){const versions=await databaseRequest<{id:string}[]>(`service_plan_versions?plan_id=eq.${encodeURIComponent(planId)}&retired_at=is.null&select=id&order=effective_at.desc&limit=1`);if(versions[0])await databaseRequest(`subscriptions?id=eq.${subscriptionId}`,jsonBody({service_plan_version_id:versions[0].id}));}
  if(staffNote)await databaseRequest("customer_notes",{method:"POST",body:JSON.stringify({customer_id:customerId,body:staffNote,visibility:"staff_only",created_by:session.id}),headers:{Prefer:"return=minimal"}});
  return NextResponse.redirect(new URL(`/bin-cleaning/crm/customers/${customerId}?saved=1`,request.url),303);
}
