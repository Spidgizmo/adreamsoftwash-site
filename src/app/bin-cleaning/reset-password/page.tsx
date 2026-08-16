import { TestBanner } from "@/components/bin-cleaning/AppShell";
import { ResetPasswordForm } from "@/components/bin-cleaning/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <>
      <TestBanner />
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-black">Choose a new password</h1>
        <p className="mt-3 text-zinc-600">
          Set a new password for your ADS Bin Cleaning customer portal.
        </p>
        <ResetPasswordForm />
      </main>
    </>
  );
}
