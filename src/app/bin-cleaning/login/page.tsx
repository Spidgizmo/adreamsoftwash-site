import { TestBanner } from "@/components/bin-cleaning/AppShell";
import { PasswordField } from "@/components/bin-cleaning/PasswordField";

type LoginSearchParams = {
  expired?: string;
  unauthorized?: string;
  error?: string;
  logged_out?: string;
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const message = searchParams.unauthorized
    ? "This test identity is not linked to an active staff role or customer account."
    : searchParams.expired
      ? "Your test session expired. Sign in again."
      : searchParams.logged_out
        ? "You have signed out."
        : searchParams.error
          ? "Sign-in failed. Check the hosted staging test credentials."
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
