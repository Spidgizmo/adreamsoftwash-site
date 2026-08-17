import { currentSession, databaseRequest, serviceRoleDatabaseRequest } from "@/lib/supabase/server";

const QUALIFIED_STATUSES = new Set(["qualified", "credit_issued", "credit_applied"]);
const PENDING_STATUSES = new Set([
  "code_entered",
  "pending_signup",
  "pending_successful_payment",
  "pending_first_service",
  "seven_day_hold",
]);

type Customer = { id: string };
type ReferralCode = { code: string };
type Relationship = {
  id: string;
  status: string;
  created_at: string;
  hold_until: string | null;
};
type Credit = {
  id: string;
  referral_relationship_id: string;
  referral_sequence: number;
  reward_percent: number;
  status: string;
  earned_at: string;
  remaining_cents: number;
};

function statusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function ReferralLedger() {
  const session = await currentSession();
  if (!session || session.role !== "customer") return null;

  const customers = await databaseRequest<Customer[]>(
    `customers?user_id=eq.${encodeURIComponent(session.id)}&select=id&limit=1`,
  ).catch(() => []);
  const customer = customers[0];
  if (!customer) return null;

  const codes = await databaseRequest<ReferralCode[]>(
    `referral_codes?customer_id=eq.${customer.id}&active=eq.true&select=code&limit=1`,
  ).catch(() => []);
  const code = codes[0]?.code;

  const [allRelationships, credits, unpaidSignups] = await Promise.all([
    databaseRequest<Relationship[]>(
      `referral_relationships?referrer_customer_id=eq.${customer.id}&select=id,status,created_at,hold_until&order=created_at.desc`,
    ).catch(() => []),
    databaseRequest<Credit[]>(
      `referral_credits?customer_id=eq.${customer.id}&select=id,referral_relationship_id,referral_sequence,reward_percent,status,earned_at,remaining_cents&order=referral_sequence.asc`,
    ).catch(() => []),
    code
      ? serviceRoleDatabaseRequest<{ id: string; submitted_at: string | null }[]>(
          `signup_leads?referral_code=eq.${encodeURIComponent(code)}&status=eq.submitted_unpaid&select=id,submitted_at&order=submitted_at.desc`,
        ).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Rejected/reversed claims are internal fraud/validation outcomes, not customer
  // referrals. Do not number or display them as if they were additional people.
  const relationships = allRelationships.filter((item) => !["rejected", "reversed"].includes(item.status));
  const qualified = relationships.filter((item) => QUALIFIED_STATUSES.has(item.status)).length;
  const inProgress = relationships.filter((item) => PENDING_STATUSES.has(item.status)).length;
  const waitingRewards = credits.filter((credit) => ["issued", "partially_applied"].includes(credit.status)).length;
  const usedRewards = credits.filter((credit) => credit.status === "applied").length;
  const creditForRelationship = new Map(credits.map((credit) => [credit.referral_relationship_id, credit]));

  return (
    <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Referral rewards</p>
          <h2 className="mt-1 text-xl font-black text-emerald-950">Your referral activity &amp; credits</h2>
          <p className="mt-1 text-sm text-emerald-900">A referral is earned after the referred Monthly customer successfully pays. First qualified referral: 50% off one eligible Monthly base cleaning. Each later qualified referral: 25%. One reward is applied per eligible Monthly invoice.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-zinc-600">Submitted, unpaid</p><p className="text-2xl font-black">{unpaidSignups.length}</p></div>
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-zinc-600">Paid / processing</p><p className="text-2xl font-black">{inProgress}</p></div>
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-zinc-600">Qualified</p><p className="text-2xl font-black">{qualified}</p></div>
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-zinc-600">Rewards waiting</p><p className="text-2xl font-black">{waitingRewards}</p></div>
        <div className="rounded-xl bg-white p-3"><p className="text-xs text-zinc-600">Rewards used</p><p className="text-2xl font-black">{usedRewards}</p></div>
      </div>

      {relationships.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-xl border border-emerald-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-emerald-100 text-emerald-950">
              <tr>
                <th className="px-4 py-3">Referral</th>
                <th className="px-4 py-3">Current status</th>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Started</th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((relationship, index) => {
                const credit = creditForRelationship.get(relationship.id);
                return (
                  <tr key={relationship.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-bold">Referral {relationships.length - index}</td>
                    <td className="px-4 py-3">{statusLabel(relationship.status)}</td>
                    <td className="px-4 py-3">
                      {credit
                        ? `${credit.reward_percent}% · ${credit.status === "applied" ? "used" : credit.status === "reversed" ? "reversed" : "waiting"}`
                        : "Not earned yet"}
                    </td>
                    <td className="px-4 py-3">{new Date(relationship.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-white p-4 text-sm text-zinc-700">No paid referral relationships yet. Submitted unpaid referral signups are counted above while they finish checkout.</p>
      )}
    </section>
  );
}
