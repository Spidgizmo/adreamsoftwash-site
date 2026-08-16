import Link from "next/link";
import { TestBanner } from "@/components/bin-cleaning/AppShell";

type ForgotPasswordSearchParams = {
  sent?: string;
  error?: string;
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<ForgotPasswordSearchParams>;
}) {
  const query = await searchParams;

  return (
    <>
      <TestBanner />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-black">Reset your password</h1>
        <p className="mt-3 text-zinc-600">
          Enter the email address used for your ADS Bin Cleaning customer portal.
        </p>

        <form
          action="/api/bin-cleaning/auth/forgot-password"
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

          <button
            className="w-full rounded-lg bg-brand-700 p-3 font-bold text-white"
            type="submit"
          >
            Email password reset link
          </button>

          {query.sent && (
            <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              If an account exists for that email, a password reset link has been sent.
            </p>
          )}
          {query.error && (
            <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">
              We could not send the reset email right now. Please try again shortly.
            </p>
          )}

          <Link
            href="/bin-cleaning/login"
            className="block text-center text-sm font-semibold text-brand-700 underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </form>
      </main>
    </>
  );
}
