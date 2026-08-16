import Link from "next/link";

export function TestBanner() {
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-sm font-bold text-amber-950">
      TEST ENVIRONMENT · FICTIONAL DATA ONLY · STRIPE TEST PAYMENTS ONLY · NO LIVE MESSAGES
    </div>
  );
}

type AppArea = "Customer portal" | "Internal CRM" | "Field work";

const AREA_LINKS: Record<AppArea, { href: string; label: string }[]> = {
  "Customer portal": [
    { href: "/bin-cleaning/portal", label: "Portal" },
  ],
  "Internal CRM": [
    { href: "/bin-cleaning/crm", label: "CRM" },
    { href: "/bin-cleaning/crm/activity", label: "Messages & notes" },
    {
      href: "/bin-cleaning/field/visits/assigned",
      label: "Field visits",
    },
  ],
  "Field work": [
    {
      href: "/bin-cleaning/field/visits/assigned",
      label: "Field visits",
    },
  ],
};

export function AppShell({
  area,
  children,
}: {
  area: AppArea;
  children: React.ReactNode;
}) {
  return (
    <>
      <TestBanner />
      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              ADS Bin Cleaning
            </p>
            <h1 className="text-3xl font-black">{area}</h1>
          </div>
          <nav
            aria-label={`${area} navigation`}
            className="flex flex-wrap gap-2 text-sm font-semibold"
          >
            {AREA_LINKS[area].map((link) => (
              <Link
                key={link.href}
                className="rounded-lg bg-zinc-100 px-3 py-2"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
            {area === "Customer portal" && (
              <form action="/api/bin-cleaning/billing-portal" method="post">
                <button
                  className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 font-black text-brand-800"
                  type="submit"
                >
                  Billing &amp; cancel
                </button>
              </form>
            )}
          </nav>
          <form action="/api/bin-cleaning/auth/logout" method="post">
            <button
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold"
              type="submit"
            >
              Log out
            </button>
          </form>
        </div>
        {children}
      </main>
    </>
  );
}

export function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div className={`card p-4 ${alert ? "border-amber-300" : ""}`}>
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

export function Definition({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}
