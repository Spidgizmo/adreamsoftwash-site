import { isStagingEnvironment } from "@/lib/app-environment";

export function StagingBanner() {
  if (!isStagingEnvironment()) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-black uppercase tracking-wide text-amber-950 sm:text-sm"
    >
      ADS Bin Cleaning staging test site — fictional data only — no real
      payments
    </div>
  );
}
