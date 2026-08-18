import Link from "next/link";
import { TestBanner } from "@/components/bin-cleaning/AppShell";
import { PasswordField } from "@/components/bin-cleaning/PasswordField";

type LoginSearchParams = {
  expired?: string;
  unauthorized?: string;
  error?: string;
  logged_out?: string;
  payment?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const query = await searchParams;
  const message = query.payment === "required"
    ? "Your signup is saved. Sign in with the customer account you already created to continue secure payment."
    : query.unauthorized
      ? "This test identity is not linked to an active staff role, active customer account, or recoverable unpaid signup."
      : query.expired
        ? "Your test session expired. Sign in again."
        : query.logged_out
          ? "You have signed out."
          : query.error
            ? "Sign-in failed. Check your email and password."
            : null;

  return (
    <>
      <TestBanner />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-black">Test account sign in</h1>
        <p className="mt-3 text-zinc-600">
          Supabase Auth accepts only fictional users connected to the hosted
          ADS Bin Cleaning staging database. No real customer or payment data
          belongs here.
        </p>
        <p className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm font-semibold text-brand-950">
          Left Stripe before paying? Sign in with the account you created during signup. If payment is still incomplete, ADS will take you back to your saved signup so you can finish secure payment without creating another account.
        </p>
        <form
          action="/api/bin-cleaning/auth/login"
          method="post"
          className="card mt-8 space-y-5 p-6"
        >
          <label className="block font-semibold">
            Email
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              className="mt-2 w-full rounded-lg border p-3"
              placeholder="customer@example.test"
            />
          </label>
          <PasswordField />
          <div className="text-right">
            <Link
              href="/bin-cleaning/forgot-password"
              className="text-sm font-semibold text-brand-700 underline underline-offset-2"
            >
              Forgot password?
            </Link>
          </div>
          <button
            className="w-full rounded-lg bg-brand-700 p-3 font-bold text-white"
            type="submit"
          >
            Sign in to test environment
          </button>
          {message && (
            <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">
              {message}
            </p>
          )}
        </form>
      </main>
    </>
  );
}
