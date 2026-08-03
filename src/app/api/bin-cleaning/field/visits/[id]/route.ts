import { NextRequest, NextResponse } from "next/server";
import { currentSession, databaseRequest } from "@/lib/supabase/server";
import { VISIT_STATUSES } from "@/lib/bin-cleaning/domain";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await currentSession();
  if (
    !session ||
    !(session.role === "field_technician" || session.role === "administrator")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const visit = (
    await databaseRequest<{ id: string }[]>(
      `service_visits?id=eq.${params.id}&select=id`,
    )
  )[0];

  if (!visit) {
    return NextResponse.json({ error: "Visit unavailable" }, { status: 404 });
  }

  if (action === "photo") {
    const kind = String(form.get("kind"));
    if (kind !== "before" && kind !== "after") {
      return NextResponse.json({ error: "Invalid photo kind" }, { status: 400 });
    }
    await databaseRequest("visit_photographs", {
      method: "POST",
      body: JSON.stringify({
        service_visit_id: visit.id,
        kind,
        storage_path: `test-only/${visit.id}-${kind}-placeholder`,
        uploaded_by: session.id,
      }),
    });
  } else if (action === "exception") {
    const details = String(form.get("details") ?? "").trim();
    if (details.length < 5) {
      return NextResponse.json(
        { error: "Exception details required" },
        { status: 400 },
      );
    }

    const administratorAuthorizes =
      session.role === "administrator" &&
      form.get("authorized_return_exception") === "on";

    await databaseRequest("service_exceptions", {
      method: "POST",
      body: JSON.stringify({
        service_visit_id: visit.id,
        exception_type: String(form.get("exception_type") ?? "other"),
        details,
        authorized_return_exception: administratorAuthorizes,
        status: administratorAuthorizes ? "authorized" : "open",
        recorded_by: session.id,
      }),
    });
  } else {
    const status = String(form.get("status"));
    if (!VISIT_STATUSES.includes(status as never)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await databaseRequest(`service_visits?id=eq.${visit.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        cleaning_confirmed: form.get("cleaning_confirmed") === "on",
        bins_returned: form.get("bins_returned") === "on",
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
    });
  }

  return NextResponse.redirect(
    new URL(`/bin-cleaning/field/visits/${visit.id}?saved=1`, request.url),
    303,
  );
}
